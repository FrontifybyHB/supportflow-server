import nodemailer from "nodemailer";
import dns from "dns";
import net from "net";
import tls from "tls";

import config from "../config/config.js";
import logger from "../loggers/winston.logger.js";

const defaultFrom = () => {
    return config.RESEND_FROM || config.EMAIL_FROM || `"SupportFlow AI" <${config.EMAIL_USER}>`;
};

const isSmtpConfigured = () => {
    return Boolean(config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASSWORD);
};

const isResendConfigured = () => Boolean(config.RESEND_API_KEY);

const activeEmailProvider = () => {
    const requested = String(config.EMAIL_PROVIDER || "auto").trim().toLowerCase();

    if (requested === "resend") return isResendConfigured() ? "resend" : null;
    if (requested === "smtp") return isSmtpConfigured() ? "smtp" : null;
    if (isResendConfigured()) return "resend";
    if (isSmtpConfigured()) return "smtp";
    return null;
};

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const emailForceIpv4 = () => parseBoolean(config.EMAIL_FORCE_IPV4, true);
const emailPort = () => Number(config.EMAIL_PORT || 587);
const emailSecure = () => emailPort() === 465;

const resolveIpv4Host = async (host) => {
    const resolved = await dns.promises.resolve4(host);
    if (resolved?.length) return resolved[0];

    const lookup = await dns.promises.lookup(host, { family: 4 });
    return lookup?.address;
};

const createIpv4Socket = async (options) => {
    const port = Number(options.port || emailPort());
    const originalHost = options.host;
    const ipv4Host = await resolveIpv4Host(originalHost);

    if (!ipv4Host) {
        throw new Error(`No IPv4 SMTP address found for ${originalHost}`);
    }

    const socketOptions = {
        host: ipv4Host,
        port,
        servername: options.servername || originalHost,
    };

    const connection = await new Promise((resolve, reject) => {
        const socket = options.secure
            ? tls.connect(socketOptions)
            : net.connect(socketOptions);

        const timeout = setTimeout(() => {
            cleanup();
            socket.destroy();
            reject(new Error(`IPv4 SMTP connection timed out after ${options.connectionTimeout || 10000}ms`));
        }, Number(options.connectionTimeout || 10000));
        timeout.unref();

        const cleanup = () => {
            clearTimeout(timeout);
            socket.removeListener("connect", onConnect);
            socket.removeListener("secureConnect", onSecureConnect);
            socket.removeListener("error", onError);
        };

        const onConnect = () => {
            if (options.secure) return;
            cleanup();
            resolve(socket);
        };
        const onSecureConnect = () => {
            cleanup();
            resolve(socket);
        };
        const onError = (error) => {
            cleanup();
            socket.destroy();
            reject(error);
        };

        socket.once("connect", onConnect);
        socket.once("secureConnect", onSecureConnect);
        socket.once("error", onError);
    });

    return {
        connection,
        secured: Boolean(options.secure),
        host: ipv4Host,
        servername: options.servername || originalHost,
    };
};

const buildTransportOptions = () => ({
    host: config.EMAIL_HOST,
    port: emailPort(),
    secure: emailSecure(),
    connectionTimeout: Number(config.EMAIL_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(config.EMAIL_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(config.EMAIL_SOCKET_TIMEOUT_MS || 15000),
    dnsTimeout: Number(config.EMAIL_DNS_TIMEOUT_MS || 5000),
    ...(emailForceIpv4() && {
        getSocket: (options, callback) => {
            createIpv4Socket(options)
                .then((socketOptions) => callback(null, socketOptions))
                .catch((error) => callback(error));
        },
    }),
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD,
    },
});

let transporter;

const getTransporter = () => {
    if (!isSmtpConfigured()) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport(buildTransportOptions());
    }

    return transporter;
};

export const verifyEmailService = async () => {
    const provider = activeEmailProvider();
    if (!provider) {
        logger.warn("Email service disabled: no email provider is configured");
        return false;
    }

    if (provider === "resend") {
        logger.info("Email service configured", { provider: "resend" });
        return true;
    }

    const transport = getTransporter();
    try {
        await transport.verify();
        logger.info("Email service verified", { provider: "smtp" });
        return true;
    } catch (error) {
        logger.error("Email service verification failed", { error: error.message });
        return false;
    }
};

export const createEmailTransporter = () => {
    if (!isSmtpConfigured()) return null;
    return nodemailer.createTransport(buildTransportOptions());
};

const sendWithResend = async ({ to, subject, html, text, from }) => {
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        Number(config.RESEND_TIMEOUT_MS || 10000)
    );
    timeout.unref();

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from,
                to,
                subject,
                html,
                text,
            }),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = payload?.message || payload?.error || response.statusText;
            throw new Error(`Resend API failed (${response.status}): ${message}`);
        }

        logger.info("Email sent", {
            to,
            subject,
            provider: "resend",
            messageId: payload.id,
        });

        return {
            provider: "resend",
            messageId: payload.id,
            accepted: [to],
        };
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(`Resend API timed out after ${config.RESEND_TIMEOUT_MS || 10000}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const sendWithSmtp = async ({ to, subject, html, text, from }) => {
    const transport = getTransporter();
    if (!transport) {
        logger.info("Email skipped because SMTP is not configured", { to, subject });
        return { skipped: true, message: "Email service is not configured" };
    }

    const result = await transport.sendMail({
        from,
        to,
        subject,
        html,
        text,
    });

    logger.info("Email sent", {
        to,
        subject,
        provider: "smtp",
        messageId: result.messageId,
    });

    return result;
};

export const sendEmail = async ({ to, subject, html, text, from = defaultFrom() }) => {
    if (!to || !subject || !html) {
        throw new Error("sendEmail requires to, subject, and html");
    }

    const provider = activeEmailProvider();
    if (!provider) {
        logger.info("Email skipped because no email provider is configured", { to, subject });
        return { skipped: true, message: "Email service is not configured" };
    }

    return provider === "resend"
        ? sendWithResend({ to, subject, html, text, from })
        : sendWithSmtp({ to, subject, html, text, from });
};

export const getEmailProviderStatus = () => ({
    provider: activeEmailProvider(),
    resendConfigured: isResendConfigured(),
    smtpConfigured: isSmtpConfigured(),
});

const otpSubject = (purpose) => {
    return purpose === "password_reset"
        ? "Reset your SupportFlow AI password"
        : "Verify your SupportFlow AI account";
};

const otpHtml = ({ otp }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">SupportFlow AI</h2>
        <p style="font-size: 16px;">Your verification code is:</p>
        <h1 style="font-size: 42px; letter-spacing: 6px; color: #007bff; background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px;">${otp}</h1>
        <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        <p style="font-size: 14px; color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
`;

export const sendOtpEmail = async ({ to, otp, purpose }) => {
    const subject = otpSubject(purpose);

    try {
        return await sendEmail({
            to,
            subject,
            html: otpHtml({ otp }),
            text: `Your SupportFlow AI code is ${otp}. It expires in 10 minutes.`,
        });
    } catch (error) {
        logger.info("OTP email failed; OTP logged for development fallback", {
            to,
            purpose,
            otp,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
};

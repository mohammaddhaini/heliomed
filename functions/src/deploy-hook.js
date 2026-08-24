const DEFAULT_TIMEOUT_MS = 10_000;
const ALLOWED_HOOK_HOST = "api.cloudflare.com";

export class DeployHookError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "DeployHookError";
        this.code = code;
    }
}

export function medicineWriteOperation(change) {
    const beforeExists = Boolean(change?.before?.exists);
    const afterExists = Boolean(change?.after?.exists);

    if (!beforeExists && afterExists) return "create";
    if (beforeExists && afterExists) return "update";
    if (beforeExists && !afterExists) return "delete";

    throw new DeployHookError("invalid-event", "Firestore write event has no document state.");
}

function validatedHookUrl(hookUrl) {
    let parsed;
    try {
        parsed = new URL(hookUrl);
    } catch {
        throw new DeployHookError("invalid-hook-url", "Cloudflare deploy hook URL is invalid.");
    }

    if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOOK_HOST) {
        throw new DeployHookError(
            "invalid-hook-url",
            "Cloudflare deploy hook must use HTTPS on api.cloudflare.com."
        );
    }

    return parsed.href;
}

export async function requestPagesDeploy({
    hookUrl,
    eventId,
    documentId,
    operation,
    fetchImpl = globalThis.fetch,
    logger = console,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    now = Date.now
}) {
    const url = validatedHookUrl(hookUrl);
    const metadata = { eventId, documentId, operation };
    const startedAt = now();
    const signal = AbortSignal.timeout(timeoutMs);

    logger.info("Requesting Cloudflare Pages rebuild.", metadata);

    let response;
    try {
        response = await fetchImpl(url, {
            method: "POST",
            headers: { Accept: "application/json" },
            signal
        });
    } catch {
        const code = signal.aborted ? "timeout" : "network-error";
        logger.error("Cloudflare Pages rebuild request failed.", {
            ...metadata,
            result: code,
            durationMs: Math.max(0, now() - startedAt)
        });
        throw new DeployHookError(
            code,
            code === "timeout"
                ? "Cloudflare deploy hook request timed out."
                : "Cloudflare deploy hook request failed."
        );
    }

    const durationMs = Math.max(0, now() - startedAt);
    if (!response.ok) {
        logger.error("Cloudflare Pages rebuild request was rejected.", {
            ...metadata,
            status: response.status,
            durationMs
        });
        throw new DeployHookError(
            "http-error",
            `Cloudflare deploy hook returned HTTP ${response.status}.`
        );
    }

    logger.info("Cloudflare Pages rebuild requested successfully.", {
        ...metadata,
        status: response.status,
        durationMs
    });

    return { status: response.status };
}


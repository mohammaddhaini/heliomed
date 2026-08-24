export const PRODUCT_BUILD_STATE_PATH = "system/productPageBuild";

export async function markProductBuildDirty({
    stateRef,
    eventId,
    documentId,
    operation,
    increment,
    timestamp
}) {
    await stateRef.set({
        dirty: true,
        version: increment(1),
        latestEventId: eventId,
        latestDocumentId: documentId,
        latestOperation: operation,
        updatedAt: timestamp()
    }, { merge: true });
}
export async function rebuildDirtyProducts({
    db,
    stateRef,
    hookUrl,
    requestDeploy,
    logger,
    timestamp
}) {
    const snapshot = await stateRef.get();
    const state = snapshot.exists ? snapshot.data() : null;

    if (!state?.dirty || !Number.isSafeInteger(state.version) || state.version < 1) {
        logger.info("No pending product-page rebuild.");
        return { requested: false, cleared: false };
    }

    const version = state.version;
    await requestDeploy({
        hookUrl,
        eventId: `catalog-version-${version}`,
        documentId: state.latestDocumentId || "multiple",
        operation: "rebuild",
        logger
    });

    const cleared = await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(stateRef);
        const current = currentSnapshot.exists ? currentSnapshot.data() : null;

        if (!current?.dirty || current.version !== version) return false;

        transaction.update(stateRef, {
            dirty: false,
            lastBuiltVersion: version,
            lastBuiltAt: timestamp()
        });
        return true;
    });

    if (!cleared) {
        logger.info("A newer catalog write arrived during the rebuild request.", { version });
    }

    return { requested: true, cleared, version };
}

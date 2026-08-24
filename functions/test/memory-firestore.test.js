import assert from "node:assert/strict";
import { it } from "node:test";

import { MemoryFirestore } from "./memory-firestore.js";

it("rolls back transaction writes when the operation fails", async () => {
    // Given
    const db = new MemoryFirestore({ "medicines/item-1": { inventory: 3 } });
    const ref = db.collection("medicines").doc("item-1");

    // When
    await assert.rejects(db.runTransaction(async (transaction) => {
        transaction.update(ref, { inventory: 0 });
        throw new Error("abort");
    }));

    // Then
    assert.equal(db.read("medicines/item-1").inventory, 3);
});

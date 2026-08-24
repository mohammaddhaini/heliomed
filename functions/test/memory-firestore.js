const clone = (value) => structuredClone(value);

class MemorySnapshot {
    constructor(ref, value) {
        this.id = ref.id;
        this.ref = ref;
        this.exists = value !== undefined;
        this.value = value;
    }

    data() {
        return this.exists ? clone(this.value) : undefined;
    }
}

class MemoryReference {
    constructor(path) {
        this.path = path;
        this.id = path.split("/").at(-1);
    }
}

class MemoryTransaction {
    constructor(store) {
        this.store = store;
        this.hasWritten = false;
    }

    async get(ref) {
        if (this.hasWritten) throw new Error("Firestore transactions require all reads before all writes.");
        return new MemorySnapshot(ref, this.store.get(ref.path));
    }

    async getAll(...refs) {
        return Promise.all(refs.map((ref) => this.get(ref)));
    }

    create(ref, value) {
        if (this.store.has(ref.path)) throw new Error(`Document already exists: ${ref.path}`);
        this.hasWritten = true;
        this.store.set(ref.path, clone(value));
    }

    update(ref, value) {
        if (!this.store.has(ref.path)) throw new Error(`Document does not exist: ${ref.path}`);
        this.hasWritten = true;
        this.store.set(ref.path, { ...this.store.get(ref.path), ...clone(value) });
    }
}

export class MemoryFirestore {
    constructor(entries = {}) {
        this.store = new Map(Object.entries(clone(entries)));
    }

    collection(name) {
        return {
            doc: (id) => new MemoryReference(`${name}/${id}`)
        };
    }

    async runTransaction(operation) {
        const transactionStore = new Map(clone([...this.store.entries()]));
        const result = await operation(new MemoryTransaction(transactionStore));
        this.store = transactionStore;
        return result;
    }

    read(path) {
        const value = this.store.get(path);
        return value === undefined ? undefined : clone(value);
    }
}

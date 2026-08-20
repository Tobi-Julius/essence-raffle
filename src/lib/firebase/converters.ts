import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

/** Generic passthrough converter that just stitches the doc id onto the data. */
export function converterFor<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T) {
      const { id: _id, ...rest } = model;
      void _id;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return { id: snapshot.id, ...snapshot.data() } as T;
    },
  };
}

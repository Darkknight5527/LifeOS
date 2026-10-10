// Every piece of LifeOS data belongs to one account.
//
// `owned` is a Mongoose plugin added to every data model. It:
//   1. adds a required, indexed `userId` field, and
//   2. REFUSES any find / count / update / delete that doesn't say whose data
//      it wants (a `userId` in the filter). A route that forgets the owner
//      fails loudly instead of quietly showing one person another's data.
//
// The only exceptions are explicit: pass { allUsers: true } as a query option
// (used by the start-up migration and by the admin "remove account" action).
import mongoose from "mongoose";

const QUERY_OPS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "countDocuments",
  "estimatedDocumentCount",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "distinct",
];

export class OwnerMissingError extends Error {
  constructor(model, op) {
    super(`Refused: ${model}.${op} without a userId filter`);
    this.name = "OwnerMissingError";
    this.status = 500;
  }
}

export function owned(schema) {
  schema.add({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true } });

  for (const op of QUERY_OPS) {
    schema.pre(op, function guard() {
      if (this.getOptions().allUsers) return;
      const filter = this.getFilter() || {};
      if (filter.userId == null) throw new OwnerMissingError(this.model.modelName, op);
    });
  }
  schema.pre("aggregate", function guard() {
    if (this.options?.allUsers) return;
    const first = this.pipeline()[0];
    if (!first?.$match || first.$match.userId == null) throw new OwnerMissingError(this._model?.modelName || "?", "aggregate");
  });
}

/** Filter for "this user's documents". */
export const mine = (req, extra = {}) => ({ ...extra, userId: req.userId });

import m0000 from "./0000_warm_jean_grey.sql";
import journal from "./meta/_journal.json" with { type: "json" };

export default {
  journal,
  migrations: {
    m0000,
  },
};

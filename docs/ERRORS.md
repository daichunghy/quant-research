# Error-code reference

This reference lists every code declared in `src/core/errors.ts`. The `check:errors` validator
compares the table with the `ERROR_CODES` registry and scans `src/` for
`finding(ERROR_CODES.<code>, ...)` call sites. The code list and emission status therefore stay
aligned with the implementation; the cause and smallest-fix descriptions remain reviewed
documentation.

`emitted` means that the current source has at least one `ERROR_CODES.<code>` call site. `defined
but not emitted` is retained below because the code is part of the exported registry, but no
current input path produces it. A warning can still appear in a successful receipt; it is not an
indication that data should be changed merely to remove the warning.

When a fix concerns observed responses or research provenance, use the verified source value or
actual citation. Do not invent provenance, drop rows or items, or alter observations only to make
an audit quieter.

| Code | Emission | Source locations | Cause | Smallest input fix |
| --- | --- | --- | --- | --- |
| `not_object` | emitted | `src/core/parse.ts` | A parser received a primitive, `null`, or array where a JSON object was required. | Replace the value at the reported path with an object, then provide that object's required fields. |
| `invalid_schema_version` | emitted | `src/core/parse.ts` | `schemaVersion` does not equal the schema version required by the parser. | Set `schemaVersion` to the exact version named in the finding message. |
| `missing_field` | emitted | `src/bundle.ts`, `src/core/parse.ts`, `src/dataset/index.ts`, `src/gap-map/index.ts` | A required field or relationship is missing; dataset audits also use this code for missing indicator cells as a warning. | Add the required field or mapping. For a missing observed cell, provide the verified response or leave the audit warning rather than inventing a value. |
| `invalid_type` | emitted | `src/core/parse.ts`, `src/dataset/index.ts`, `src/gap-map/index.ts`, `src/instrument/index.ts`, `src/measurement/index.ts`, `src/recode/index.ts`, `src/topic-card/index.ts` | A value has the wrong JSON type or an unknown field was supplied; the dataset audit also uses this code for straight-line warnings. | Use the type required by the finding or remove the unknown field. A straight-line warning has no data-edit fix; review the observations instead. |
| `invalid_identifier` | emitted | `src/core/parse.ts`, `src/instrument/index.ts` | A construct or item code fails the code pattern, a column name fails the column-name pattern, or an item code does not use its construct prefix as a warning. | Use a valid identifier and, for the prefix warning, rename the item with the construct prefix while preserving its meaning. |
| `invalid_enum` | emitted | `src/core/parse.ts`, `src/recode/index.ts` | An enum field contains a value outside the closed vocabulary declared by the parser. | Replace it with one of the allowed values listed in the finding message. |
| `empty_collection` | emitted | `src/core/parse.ts`, `src/instrument/index.ts`, `src/measurement/index.ts` | A required collection is absent, not an array, or empty; measurement compilation also uses this code as a warning when structural paths are absent. | Provide at least one valid member when the collection is required. For a measurement-only warning, add only a real intended hypothesis or accept the warning. |
| `duplicate_code` | emitted | `src/dataset/index.ts`, `src/instrument/index.ts`, `src/topic-card/index.ts` | A construct code, item code, hypothesis ID, anchor value, or respondent ID is repeated. | Correct the duplicate identifier or anchor using the real distinct value; do not duplicate or delete research records just to silence the finding. |
| `duplicate_column` | emitted | `src/dataset/index.ts` | Two dataset column definitions have the same name. | Rename one column to a new valid name or remove the redundant definition after confirming the source mapping. |
| `invalid_scale` | emitted | `src/dataset/index.ts`, `src/gap-map/index.ts`, `src/instrument/index.ts` | A declared scale is invalid, an observed scale hint is not made of integers, or an observed response is outside the instrument's Likert bounds. | Declare an allowed scale with `min < max`, correct a scale hint to the verified integers, or correct the response only when the source record proves it was entered incorrectly. |
| `invalid_anchor` | emitted | `src/instrument/index.ts` | A scale anchor is not an integer or falls outside the declared scale. | Use an integer anchor within the declared `min` and `max` values. |
| `cited_without_source` | emitted | `src/instrument/index.ts` | An item is marked `cited` without a non-empty `source.citation`. | Add the actual citation, or change the item status to `demonstration` when no citation exists. |
| `reverse_scale_unsupported` | emitted | `src/instrument/index.ts` | A scale with anchors does not include both scale endpoints, so its reverse mapping is not supported. | Add verified anchors for both declared endpoints, or omit the optional anchors when they are not needed. |
| `unknown_construct` | emitted | `src/recode/index.ts`, `src/topic-card/index.ts` | A topic card or recode operation refers to a construct absent from the instrument. | Reference an existing construct code or add the real construct definition to the instrument. |
| `unknown_item` | emitted | `src/dataset/index.ts`, `src/recode/index.ts` | A dataset indicator or reverse-score operation refers to an item absent from the instrument; audits also warn when an instrument item has no mapped indicator column. | Correct the item mapping to an existing item or add the real indicator column when it exists in the source dataset. |
| `orphan_hypothesis` | emitted | `src/topic-card/index.ts` | A hypothesis has the same source and target, or refers to a construct outside the selected instrument constructs. | Reference two distinct existing construct codes and include both in `constructCodes`. |
| `row_count_mismatch` | emitted | `src/dataset/index.ts` | `rowCount` is not equal to the number of entries in `rows`. | Set `rowCount` to the exact current `rows.length`; do not drop or add rows as a validation shortcut. |
| `unknown_column` | emitted | `src/dataset/index.ts`, `src/recode/index.ts` | A row contains an undeclared column, or a recode operation refers to a missing source or indicator column. | Declare the actual column and its mapping, or change the operation to an existing column. |
| `column_exists` | emitted | `src/recode/index.ts` | A recode target already exists in the dataset or in an earlier operation. | Choose a new valid `as` column name that is not already present. |
| `non_numeric` | emitted | `src/dataset/index.ts`, `src/recode/index.ts` | A dataset audit or numeric recode operation encountered a non-numeric indicator value. | Supply the verified numeric response or use `null` for a genuinely missing response; do not coerce arbitrary text. |
| `empty_operations` | defined but not emitted | `src/core/errors.ts` registry only | The code is exported in the registry, but the current source has no `finding(ERROR_CODES.empty_operations, ...)` call site. Empty recode operations currently use `empty_collection`. | No current input triggers this code. Do not document it as a runtime result unless a source call site is added and this table is updated. |
| `under_identified` | emitted | `src/measurement/index.ts` | A measurement construct has fewer items than the mode-and-kind heuristic minimum; this is a warning unless `strict` is true. | Add enough real indicators to meet the applicable minimum: reliability-only 2, PLS reflective 2 or formative 1, CB-SEM reflective 3 or formative 2. This does not prove model fit. |
| `invalid_receipt` | emitted | `src/core/receipt.ts` | A receipt has an invalid shape, status, digest, compiler field, finding, count, or digest mismatch with its input or artifact. | Regenerate the receipt from the exact input and artifact produced together; do not hand-edit digest fields. |

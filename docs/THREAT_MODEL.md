# Threat model

## Assets

- Integrity of recoded research data (wrong reverse-score silently flips a construct).
- Provenance of “validated” scales (an agent labelling demonstration items as published).
- Receipt digests used as audit evidence.

## Trust boundaries

| Input | Trust |
| --- | --- |
| Typed JSON via library or CLI | Untrusted until parsed |
| Example TAM items | Demonstration only |
| SPSS / lavaan / AMOS / SmartPLS engines | Out of process; not invoked |
| Model providers | Out of process; not invoked |

## Controls

- Fail-closed parsers; closed recode vocabulary.
- `cited` requires a citation string. Examples use `demonstration`.
- Recode cannot overwrite existing columns and cannot drop rows.
- Canonical digest over the exact artifact bytes the receipt names.
- CLI JSON size cap (2 MiB).
- Zero production dependencies; no network client.

## Non-claims

A valid receipt does not prove: ethical approval, informed consent, a correctly specified SEM, an executed SPSS job, or that the items measure the construct in a population.

## Abusive use

The library will not grow helpers whose only purpose is to delete cases/items until alpha, AVE, or a p-value looks publishable.

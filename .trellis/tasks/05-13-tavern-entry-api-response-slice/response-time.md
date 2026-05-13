# Tavern Entry API Response-Time Evidence

Local focused timing using FastAPI `TestClient` against JSON storage. Each page-critical endpoint ran 20 times after fixture setup. Refreshed after FastAPI lifespan cleanup.

| Endpoint | Runs | Max (s) | Mean (s) | P95 (s) | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `GET /api/v1/taverns/{id}?view=entry` | 20 | 0.0188 | 0.0165 | 0.0182 | PASS_UNDER_1S |
| `GET /api/v1/taverns/{id}/roleplay` | 20 | 0.0181 | 0.0155 | 0.0174 | PASS_UNDER_1S |
| `POST /api/v1/taverns/{id}/enter` | 20 | 0.0439 | 0.0336 | 0.0422 | PASS_UNDER_1S |
| `GET /api/v1/taverns/{id}/gameplays` | 20 | 0.0189 | 0.0150 | 0.0170 | PASS_UNDER_1S |
| `GET /api/v1/taverns/{id}/gameplay-sessions` | 20 | 0.0199 | 0.0166 | 0.0190 | PASS_UNDER_1S |

Raw JSON:

```json
[
  {
    "label": "GET /api/v1/taverns/{id}?view=entry",
    "runs": 20,
    "max": 0.018834000000424567,
    "mean": 0.016526769999927637,
    "p95": 0.01820930000030785,
    "statuses": [
      200
    ],
    "status": "PASS_UNDER_1S"
  },
  {
    "label": "GET /api/v1/taverns/{id}/roleplay",
    "runs": 20,
    "max": 0.018128300000171294,
    "mean": 0.015548955000213027,
    "p95": 0.017423400000552647,
    "statuses": [
      200
    ],
    "status": "PASS_UNDER_1S"
  },
  {
    "label": "POST /api/v1/taverns/{id}/enter",
    "runs": 20,
    "max": 0.043902999999772874,
    "mean": 0.03355691000015213,
    "p95": 0.042175399999905494,
    "statuses": [
      200
    ],
    "status": "PASS_UNDER_1S"
  },
  {
    "label": "GET /api/v1/taverns/{id}/gameplays",
    "runs": 20,
    "max": 0.01888409999992291,
    "mean": 0.014994665000085661,
    "p95": 0.01698690000011993,
    "statuses": [
      200
    ],
    "status": "PASS_UNDER_1S"
  },
  {
    "label": "GET /api/v1/taverns/{id}/gameplay-sessions",
    "runs": 20,
    "max": 0.01994669999839971,
    "mean": 0.0166098099998635,
    "p95": 0.018977800000357092,
    "statuses": [
      200
    ],
    "status": "PASS_UNDER_1S"
  }
]
```

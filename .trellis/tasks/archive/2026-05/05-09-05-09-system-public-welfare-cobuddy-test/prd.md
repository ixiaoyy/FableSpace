# Switch system public welfare LLM to baidu/cobuddy:free

## Goal

Update the backend system/public-welfare LLM test config to use the requested `baidu/cobuddy:free` model and verify whether the backend can reach it.

## Requirements

- Change only the versioned system/public-welfare LLM model identifier unless testing proves a minimal endpoint/backend adjustment is required.
- Do not expose or log the API key.
- Use the existing backend LLM test path or direct backend client code for verification.
- Preserve owner-token/key privacy and public-welfare-only scope.

## Acceptance Criteria

- [x] `backend/config/system_public_welfare_llm.json` points to `baidu/cobuddy:free`.
- [x] A real backend LLM connectivity check is run against the configured endpoint.
- [x] Result is reported with status, model/preview if successful, or sanitized error if failed.

## Technical Notes

Existing config uses `backend="custom"` and `base_url="https://api.kilo.ai/api/gateway"`; the client tries OpenAI-compatible paths under that base URL. Do not print the credential.


## Validation

Passed on 2026-05-09:

```powershell
# POST /api/llm/test-config using backend/config/system_public_welfare_llm.json, without printing the API key
# Result: {"ok": true, "message": "连接成功", "model": "baidu/cobuddy-20260430:free", "preview": "你好！很高兴见到你 😊"}
py -3 -m compileall -q backend/src
```

## Notes

- Only the model identifier was changed from `kilo-auto/free` to `baidu/cobuddy:free`.
- The provider returned the resolved model name `baidu/cobuddy-20260430:free`.
- API key was not printed in validation output.

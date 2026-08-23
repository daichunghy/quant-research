# Grant path — honesty rules for Github 4

Tạo repo này **không** làm `daichunghy` đủ Claude Max, Codex for OSS, hay ChatGPT Pro.

## Hiện trạng sau foundation local

| Tín hiệu Anthropic / OpenAI có thể verify | Giá trị |
| --- | --- |
| Dependent repos / packages | 0 |
| Monthly downloads | 0 (`private: true`) |
| External contributors | 0 |
| Public npm | unpublished |
| OpenSSF criticality ≥ 0.4 | không claim |

## Cấm

Trùng spirit của Claude for OSS terms mục 7:

- tách package rỗng `@agentbiz/sales-crm`, `finance-hr`, `edu-student` để nhân dependents
- tự fork template / tự install vòng để đếm download
- mua star, bot, contribution-graph padding
- nộp form bằng README foundation này
- ghi “hundreds of dependent repos” trước khi GitHub dependency graph hiện số đó

## Đường thật (không làm trong lượt ship)

1. Giữ contract ổn, test xanh.
2. Public GitHub chỉ khi owner authorize — yêu cầu hiện tại là owner authorization cho public alpha, không phải bằng chứng grant.
3. Một consumer ngoài thật (EduTech, research CLI, hoặc OpenSheet consume artifact).
4. npm publish khi owner authorize và org `@agentbiz` tồn tại; nếu org chưa có quyền publish thì phải dừng ở GitHub release, không đổi tên package để né namespace.
5. Form Claude vẫn **contribkit**. Form Codex vẫn **PatchGate**.

Github 4 chỉ trở thành câu chuyện Ecosystem Impact khi có dependents **thật**. Micro-package là hệ quả của API ổn, không phải chiến thuật grant.

# 성공로그 메일 알림 설정

사례가 공유되면 Supabase Edge Function `notify-story`가 Resend를 통해 아래 주소로 알림 메일을 보냅니다.

- indiheating@kyobobook.com
- kyj57@kyobobook.com

메일 제목은 `'성공로그' 새 사례가 공유되었습니다!` 입니다.

## 1. Resend API Key 준비

Resend에서 API Key를 생성합니다.

발신 주소를 직접 사용하려면 Resend에서 발신 도메인 또는 발신 이메일 인증이 필요할 수 있습니다.

## 2. Supabase CLI 설치 및 로그인

PowerShell에서 아래 명령을 실행합니다.

```powershell
supabase login
supabase link --project-ref jeamxtrbxtcnzblhpnaf
```

## 3. 비밀키 설정

```powershell
supabase secrets set RESEND_API_KEY="여기에_Resend_API_Key"
supabase secrets set NOTIFY_FROM_EMAIL="성공로그 <인증된_발신주소>"
```

`NOTIFY_FROM_EMAIL`을 설정하지 않으면 기본값으로 `성공로그 <onboarding@resend.dev>`를 사용합니다.

## 4. Edge Function 배포

```powershell
supabase functions deploy notify-story
```

배포 후 새 사례가 공유되면 사이트가 `notify-story` 함수를 호출하고, 함수가 알림 메일을 발송합니다.

메일 발송에 실패해도 사례 저장은 유지되며, 실패 내용은 브라우저 콘솔에만 기록됩니다.

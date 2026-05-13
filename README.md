# Card News Studio

본부/실별 성과 스토리를 취합하고, 취합된 내용을 바탕으로 1장짜리 카드뉴스를 제작하는 정적 웹앱입니다.

## 실행 방법

가장 간단한 방법은 `index.html` 파일을 브라우저에서 여는 것입니다.

```powershell
cd "C:\Users\ineih\Desktop\codex window\card-news-studio"
start index.html
```

로컬 서버로 확인하고 싶다면 아래 명령을 사용할 수 있습니다.

```powershell
python -m http.server 5173
```

그 다음 브라우저에서 `http://localhost:5173`을 열면 됩니다.

## 외부 무료 공개

외부 담당자들이 같은 취합 데이터를 보려면 `GitHub Pages + Supabase Free` 조합을 사용합니다.

1. Supabase에서 무료 프로젝트를 만듭니다.
2. `supabase/schema.sql`을 SQL Editor에서 실행합니다.
3. `config.js`에 Supabase Project URL과 `anon public` key를 입력합니다.
4. GitHub Pages에 이 폴더를 업로드해 공개합니다.

상세 절차는 `DEPLOY_FREE.md`를 참고하세요.

## 주요 기능

- 본부/실 담당자용 성과 및 활동 사례 공유 폼
- 필수 칸 누락 시 `특정 칸을 입력하지 않으셨습니다` 형식의 경고 메시지 표시
- 제출 스토리 `localStorage` 저장 또는 Supabase 무료 공용 저장
- 삭제 비밀번호를 통한 공유 사례 직접 삭제
- 공유된 사례 목록 검색, 연월 필터, 비밀번호 기반 직접 삭제
- 7종 카드뉴스 시안 템플릿 제공
- 공유 내용을 기반으로 이미지 생성 프롬프트 자동 생성
- 1080x1080 카드뉴스 캔버스 미리보기
- 카드뉴스 시안 공유 및 PNG 다운로드

## 다음 확장 아이디어

- 사내 SSO 로그인 및 본부/실 권한 관리
- 관리자 승인 플로우
- OpenAI 이미지 생성 API 연동
- 제출 데이터 백엔드 저장 및 월별 리포트 다운로드
- 카드뉴스 템플릿 브랜드 가이드 적용

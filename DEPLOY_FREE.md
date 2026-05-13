# 무료 외부 공개 배포 가이드

이 프로젝트는 비용 없이 외부에서 접근할 수 있도록 아래 조합을 기준으로 만들었습니다.

- 무료 호스팅: GitHub Pages
- 무료 공용 저장소: Supabase Free
- 로컬 예비 모드: Supabase 설정이 비어 있으면 브라우저 `localStorage` 사용

## 1. Supabase 무료 저장소 만들기

1. [Supabase](https://supabase.com)에 무료 계정으로 로그인합니다.
2. 새 프로젝트를 생성합니다.
3. 왼쪽 메뉴의 `SQL Editor`에서 `supabase/schema.sql` 내용을 붙여넣고 실행합니다.
4. `Project Settings > API`에서 아래 값을 확인합니다.
5. `Project URL`
6. `anon public` key

## 2. config.js에 무료 저장소 연결하기

`config.example.js`를 참고해서 `config.js`를 아래처럼 수정합니다.

```js
window.CARD_NEWS_STUDIO_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  storyBucket: "story-images",
  cardBucket: "card-images",
};
```

`anon public` key는 프론트엔드에 노출되는 공개 키입니다. 대신 `service_role` key는 절대 넣으면 안 됩니다.

## 3. GitHub Pages로 무료 공개하기

1. GitHub에서 새 저장소를 만듭니다.
2. `card-news-studio` 폴더 안의 파일을 저장소에 업로드합니다.
3. 저장소의 `Settings > Pages`로 이동합니다.
4. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
5. `main` 브랜치와 `/root` 폴더를 선택하고 저장합니다.
6. 몇 분 뒤 표시되는 GitHub Pages URL을 본부/실 담당자들에게 공유합니다.

## 4. 이미 배포한 뒤 비밀번호 삭제 기능을 추가하는 경우

이미 Supabase 프로젝트를 만들어 운영 중이라면, `supabase/migrations/2026-05-password-delete.sql`을 Supabase SQL Editor에서 한 번 더 실행해 주세요.

이 SQL은 아래 기능을 추가합니다.

- 사례 공유 시 입력한 삭제 비밀번호의 해시 저장 칸
- 비밀번호가 일치할 때만 해당 사례를 삭제하는 함수

기능 추가 전에 공유된 기존 사례는 삭제 비밀번호가 없기 때문에 웹 화면에서 직접 삭제할 수 없습니다.

## 운영상 주의점

- 이 무료 MVP는 로그인 없이 제출/조회가 가능합니다. 링크를 아는 사람은 데이터를 볼 수 있으니 사내에서만 공유해 주세요.
- 사례 삭제는 공유자가 입력한 삭제 비밀번호가 일치할 때만 가능합니다.
- 이미지와 카드뉴스는 Supabase Storage 무료 용량을 사용합니다. 장기 운영 전에는 월별 아카이브 정책을 정하는 것이 좋습니다.

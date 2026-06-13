<p align="center">
  <img src="assets/banner.png" alt="create-sso-kit — 한 번의 명령으로 스캐폴딩하는 서브도메인 SSO" width="100%" />
</p>

[English](README.md) · [한국어](README.ko.md)

# create-sso-kit

[![npm version](https://img.shields.io/npm/v/create-sso-kit.svg)](https://www.npmjs.com/package/create-sso-kit)
[![license: MIT](https://img.shields.io/npm/l/create-sso-kit.svg)](LICENSE)

**서브도메인 통합 로그인(SSO)** 스타터 — [Next.js 15](https://nextjs.org) + [Convex](https://convex.dev) + [Better Auth](https://better-auth.com) — 를 스캐폴딩하고, 나머지 설정은 당신의 AI 코딩 에이전트가 대신 끝내도록 맡기는 도구입니다. `create` 명령 한 번이면 동작하는 모노레포가 새 폴더에 떨어지고, 이미 쓰고 있는 Claude Code나 Codex 세션이 함께 들어 있는 런북을 읽으며 사람만 할 수 있는 부분(Convex 로그인, dev 도메인 선택)을 SSO가 끝까지 검증될 때까지 안내합니다.

## 이게 뭔가요?

`create-sso-kit`은 **얇은 스캐폴더와 두꺼운 런북의 조합**입니다. CLI는 결정적인 파일 작업만 합니다 — 핀으로 고정된 [`sso-kit`](https://github.com/NewTurn2017/sso-kit) 템플릿 tarball을 받아 새 프로젝트에 풀고, 파일 몇 개를 손보고, git을 다시 초기화한 뒤, 다음 단계를 한 줄로 출력합니다. 아무것도 설치하지 않고, 환경 변수를 건드리지 않으며, 내장된 LLM도 없습니다.

설정에서 결정이 필요하거나 사람만 할 수 있는 부분 — `pnpm install`, 대화형 Convex 로그인, 네 개의 `convex env set` 값, 앱별 `.env.local`, dev 도메인 선택, 실행/검증 — 은 스캐폴딩된 프로젝트 *안에* 함께 들어 있는 런북(`SETUP.md`)에 담겨 있습니다. **이미 쓰고 있는 코딩 에이전트가 그 런북을 한 단계씩 실행**하며, 꼭 필요한 곳에서만 멈춰 당신에게 묻습니다. 그 에이전트는 당신이 평소에 돌리던 바로 그 에이전트입니다. CLI는 코드를 디스크에 올려놓고 에이전트에게 지침을 가리켜 줄 뿐입니다.

## 언제 쓰면 좋은가

이 키트는 **하나의 공유 상위 도메인의 서브도메인들에 흩어져 있으면서 로그인은 하나로 묶고 싶은 여러 앱**을 위해 만들어졌습니다. 잘 맞는 경우는 다음과 같습니다:

- 제품 앱 + 마케팅 사이트 + 문서 — `app.example.com`, `www.example.com`, `docs.example.com` — 가 하나의 브랜드 아래에서 로그인한 사용자 한 명을 모두 똑같이 인식해야 하는 경우.
- 여러 소비자 앱(`chat.example.com`, `notes.example.com`, …) 앞에 중앙 로그인 포털(`auth.example.com`)을 두고, 한 번 로그인하면 전부 로그인되게 하고 싶은 경우.
- 하나의 세션과 **즉각적인** 로그아웃을 공유해야 하는, 서브도메인에 올라간 사내 도구 묶음.
- **직접 작성하는 인증 코드 거의 없이** 중앙 로그인 + 중앙 로그아웃을 원하는 경우 — 키트는 이를 직접 만든 인증 서비스가 아니라 Better Auth의 `crossSubDomainCookies` + 단일 공유 Convex 배포로 얻습니다.
- 남은 설정을 12쪽짜리 매뉴얼이 아니라 에이전트가 안내해 주는, "클론하면 곧바로 돌아가는" 스타터를 원하는 경우.

### 언제 쓰면 안 되는가 / 목표가 아닌 것

이건 의도적으로 정한 범위 결정입니다 — 앞의 네 가지는 키트의 아키텍처 기록에 남아 있고, 마지막 하나는 설계 근거입니다. 아래 중 하나가 필요하다면 다른 도구를 찾아보세요:

| 이런 게 필요하다면… | 이 키트가 답이 아닌 이유 |
|---|---|
| **서로 다른 루트 도메인 간 SSO** (`brandA.com` ↔ `brandB.io`) | v1에서 명시적으로 범위 밖입니다. 쿠키 메커니즘은 하나의 공유 상위 도메인의 서브도메인들에만 걸칩니다. 루트 도메인 간 SSO는 잘해야 Better Auth의 OAuth Provider Plugin을 기다리는 조건부 v2 항목입니다. |
| **제3자를 위한 OIDC / OAuth / SAML 아이덴티티 제공자가 *되는* 것** (외부 앱에 토큰 발급) | 목표가 아닙니다. `oidcProvider` 경로는 기각됐습니다(벤더가 폐기 예정이자 "프로덕션 용도로는 적합하지 않을 수 있다"고 표시). `@better-auth/sso`는 외부 IdP를 소비하는 쪽이라 Convex 통합과 호환되지 않습니다. |
| 자체 `/sessions` API + Redis를 갖춘 **자체 호스팅 인증 마이크로서비스** | 일부러 만들지 않았습니다. 그건 Better Auth + Convex가 이미 제공하는 것을 다시 만드는 일이고, 보안에 민감한 세션 코드를 공개 스타터에서 직접 유지보수하게 만듭니다. |
| **무상태 JWT 세션**, 또는 각자 본부와 통신하는 **앱별 독립 Convex 배포** | 기각된 설계입니다. 무상태 JWT로는 로그아웃 전파가 어렵고, 배포 간 인증은 컴포넌트의 공식 지원 범위 밖입니다. 키트는 단일 공유 Convex 배포를 중앙 세션 저장소로 사용합니다. |
| **단일 독립 실행 앱** | 과한 선택입니다. 서브도메인 간 쿠키 장치, 로그인 포털 리다이렉트 미들웨어, 공유 배포 배선은 앱이 2개 이상일 때만 값을 합니다. (기록된 ADR 결정이 아니라 설계 근거입니다.) |

## 사전 준비물

시작하기 전에 필요한 도구 몇 가지입니다 (전체 목록은 [요구 사항](#requirements)에 있습니다):

- **코딩 에이전트** — [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 또는 [Codex](https://github.com/openai/codex), 설치하고 로그인된 상태여야 합니다. 함께 들어 있는 `SETUP.md`를 읽고 2–8단계를 대신 실행합니다. *에이전트가 없다면? [전체 둘러보기](#full-walkthrough)를 직접 따라 하세요 — `SETUP.md`와 동일합니다.*
- **pnpm 10** — `corepack enable`(Node에 포함)으로 고정하거나 [pnpm.io](https://pnpm.io)를 참고하세요. `pnpm install`, `pnpm dev:auth`, `pnpm dev:chat`에 필요합니다.
- 스캐폴딩된 Next.js 15 앱에는 **Node ≥ 18.18** (Node 20 LTS 권장). CLI 자체는 Node ≥ 18이면 충분합니다.
- **무료 [Convex](https://convex.dev) 계정** — 대화형 로그인은 에이전트가 안내합니다.

## 빠른 시작

```bash
pnpm create sso-kit my-app
# or:  npm  create sso-kit@latest my-app
# or:  npx  create-sso-kit my-app
```

그다음 나머지는 에이전트에게 맡깁니다:

```bash
cd my-app
claude          # or: codex
```

에이전트는 `AGENTS.md` / `CLAUDE.md`를 읽고 `SETUP.md`를 찾아 키트 설정을 단계별로 안내합니다 — Convex 로그인과 dev 도메인 선택에서는 당신의 입력을 기다리며 멈춥니다.

**에이전트가 없나요?** 직접 키트를 돌릴 수 있습니다 — 아래 [전체 둘러보기](#full-walkthrough)를 따라 하세요. `SETUP.md`와 동일한 내용입니다.

프로젝트 이름을 생략하면 CLI가 스캐폴딩 전에 한 번 물어봅니다(`Project name: `).

## 전체 둘러보기

빈 폴더에서 검증된 SSO까지, 처음부터 끝까지 한 번 돌려보는 과정입니다.

### 1. 스캐폴딩 (CLI, 수 초)

```bash
pnpm create sso-kit my-app
```

CLI는 당신이 입력한 값에서 결정된 프로젝트 이름과 함께 진행 상황을 출력합니다:

```
Scaffolding my-app from sso-kit@v0.1.3…

✅ Created my-app.

Next: cd my-app && claude   (or codex)
Your agent will walk you through setup via SETUP.md (it'll use pnpm).
```

내부적으로는 `https://github.com/NewTurn2017/sso-kit/archive/refs/tags/v0.1.3.tar.gz`를 내려받고, 아카이브의 최상위 디렉터리를 벗겨 파일이 곧바로 `my-app/`에 떨어지게 하며, 루트 `package.json`의 `name`을 npm 안전 슬러그로 설정하고, `SETUP.md` 안의 `{{PROJECT_NAME}}` 토큰을 당신의 디렉터리 이름으로 치환한 뒤, git을 `main` 브랜치의 단일 커밋으로 다시 초기화합니다. `git`이 `PATH`에 없으면 그 단계를 건너뛰고 알려줍니다 — 스캐폴딩 자체는 그래도 성공합니다:

```
note: git wasn't initialized — install git and run "git init" in my-app.
```

### 2. 에이전트에게 넘기기

```bash
cd my-app
claude          # or: codex
```

들어오자마자 에이전트는 `CLAUDE.md` / `AGENTS.md`(바이트까지 동일한 포인터)를 읽고 이렇게 지시받습니다 — `apps/*/.env.local`이 아직 없으면 `SETUP.md`를 한 단계씩 따라가라.

### 3. 에이전트가 `SETUP.md`를 실행 (사람 전용 관문 2개 포함)

`SETUP.md`는 에이전트를 *위해* 쓰인 8단계 런북입니다. 할 수 있는 단계는 전부 처리하고 **🚦 HUMAN-ONLY로 표시된 단계에서 멈춥니다**:

| 단계 | 무슨 일이 일어나나 | 담당 |
|---|---|---|
| 1. 인사 & 안내 | 에이전트가 흐름을 설명하고 두 번의 멈춤을 미리 알려줍니다. | 에이전트 |
| 2. 의존성 설치 | `pnpm install`, 깔끔하게 끝나는지 확인합니다. | 에이전트 |
| 3. Convex 연결 | 🚦 **당신이** `cd packages/backend && npx convex dev`를 실행합니다 — 브라우저 로그인, 프로젝트 생성/선택 후 그대로 켜 둡니다. 그러면 에이전트가 `packages/backend/.env.local`에서 `CONVEX_URL` / `CONVEX_SITE_URL`을 읽습니다. **배포 URL을 절대 지어내지 않습니다**. | 🚦 사람, 그다음 에이전트 |
| 4. dev 도메인 선택 | 🚦 에이전트가 `lvh.me`를 제안하며 그대로 쓸지, 아니면 커스텀 공유 상위 `<DOMAIN>`을 줄지 **당신에게 묻습니다**. 오리진은 `http://auth.<DOMAIN>:3000`과 `http://chat.<DOMAIN>:3001`으로 유도됩니다. | 🚦 사람 |
| 5. Convex 환경 변수 설정 | `packages/backend/`에서 에이전트가 배포 변수 네 개를 설정합니다 — `BETTER_AUTH_SECRET`(멱등, `openssl rand -base64 32` 사용), `SITE_URL`, `COOKIE_DOMAIN`, `TRUSTED_ORIGINS`. | 에이전트 |
| 6. 앱별 `.env.local` 작성 | 두 앱 모두 `.env.example` → `.env.local`로 복사하고 `NEXT_PUBLIC_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_SITE_URL`을 채웁니다(둘 다 같은 배포). 커스텀 도메인을 골랐다면 오리진 줄을 다시 씁니다. | 에이전트 |
| 7. 실행 & 검증 | `pnpm dev:auth`와 `pnpm dev:chat`을 띄우고, G3 스모크 테스트를 돌린 뒤, 브라우저 검증을 안내합니다. | 에이전트 + 당신 |
| 8. 선택: 공개 | GitHub에 푸시할지 제안합니다 — 당신이 동의할 때만. | 에이전트 |

기본값 `lvh.me`라면 5단계는 다음으로 풀립니다:

```bash
# in packages/backend/  (convex dev still running in another terminal)
# idempotent: only sets BETTER_AUTH_SECRET if it isn't already set, so re-running never rotates it
test -n "$(npx convex env get BETTER_AUTH_SECRET 2>/dev/null)" || npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL          http://auth.lvh.me:3000
npx convex env set COOKIE_DOMAIN     lvh.me
npx convex env set TRUSTED_ORIGINS   http://auth.lvh.me:3000,http://chat.lvh.me:3001
```

> `openssl`이 없나요? 32자 이상의 무작위 문자열이면 무엇이든 됩니다 — 예: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

> `BETTER_AUTH_SECRET`은 첫 회원가입 **전에** 설정돼 있어야 하며, 위의 가드된 명령은 이를 멱등하게 설정하므로 설정을 다시 돌려도 키가 바뀌지 않습니다. Better Auth는 이 시크릿으로 JWKS 서명 키를 암호화합니다 — 혹시 바꾸게 된다면 문제 해결을 참고하세요.

그리고 6단계는 각 앱의 env 파일을 복사하고 각각 두 개의 키를 채웁니다(두 앱 모두 같은 Convex 배포):

```bash
# from the repo root
cp apps/auth/.env.example apps/auth/.env.local
cp apps/chat/.env.example apps/chat/.env.local
# in each .env.local, set (values read from packages/backend/.env.local):
#   NEXT_PUBLIC_CONVEX_URL       = CONVEX_URL
#   NEXT_PUBLIC_CONVEX_SITE_URL  = CONVEX_SITE_URL
# then rewrite the origin lines if you chose a custom domain.
```

정확한 명령은 `SETUP.md` 6단계에 있으며 직접 따라 할 수 있습니다.

### 4. 두 앱을 `lvh.me`에서 실행

세 개의 터미널을 동시에 모두 띄워 둡니다:

```bash
# packages/backend/
npx convex dev          # the shared central session store

# repo root
pnpm dev:auth           # → http://auth.lvh.me:3000   (login portal)
pnpm dev:chat           # → http://chat.lvh.me:3001   (demo consumer)
```

`lvh.me`는 `127.0.0.1`로 해석되는 공개 DNS라서, `auth.lvh.me`와 `chat.lvh.me`는 **`/etc/hosts` 편집 없이도** 공유 상위 도메인의 진짜 서브도메인이 됩니다.

### 5. SSO 검증 (G1–G4 관문)

키트는 실제 스택(두 개의 Next.js dev 서버 + 살아 있는 Convex 배포 + Better Auth)에서 실제 Chrome 프로필로 검증됐습니다. 네 개의 관문이 모두 통과합니다:

| 관문 | 보장 내용 | 확인 방법 |
|---|---|---|
| **G3** 미인증 리다이렉트 | 세션 없이 `GET chat.lvh.me:3001/protected` → `auth.lvh.me:3000/login?redirect=<original-url>` | 헤드리스: `curl -sI http://chat.lvh.me:3001/protected \| grep -i '^location:'`가 `…/login?redirect=…`를 가리켜야 합니다 (또는 브라우저에서 URL을 열어 리다이렉트를 확인) |
| **G1** 서브도메인 간 세션 | `auth`에서 회원가입 → `chat`의 보호 페이지에 내 이메일이 표시되고, `auth` 로그인 페이지도 인증된 상태로 렌더링됩니다. 하나의 세션이 두 서브도메인 모두에 적용됩니다. | 브라우저 |
| **G2** 중앙 로그아웃 | `chat`에서 `signOut()` → `auth`는 로그인 폼으로 돌아가고 `chat`은 즉시 다시 차단됩니다. | 브라우저 |
| **G4** 쿠키 도메인 / CSRF | `Set-Cookie: better-auth.session_token=…; Domain=lvh.me; HttpOnly; SameSite=Lax`. `Origin` 헤더가 없는 요청은 `403`으로 거부됩니다. | `curl` / DevTools |

G3가 통과하면, 사람이 실제 브라우저에서 나머지 왕복을 마칩니다: `http://auth.lvh.me:3000/login`에서 회원가입(가입은 열려 있음) → `http://chat.lvh.me:3001/protected`를 열어 내 이메일 확인 → `auth.lvh.me`도 로그인된 상태로 보이는지 확인 → 로그아웃하고 두 앱이 모두 떨어지는지 지켜보기. 전체 클릭 경로는 `SETUP.md` 7단계에 있습니다.

## 무엇이 들어 있나

모든 서브도메인에 걸쳐 하나의 로그인과 하나의 세션으로 서브도메인 SSO를 보여 주는 pnpm + Turborepo 모노레포(`sso-kit-poc`)입니다:

```
my-app/
├─ apps/
│  ├─ auth/            @sso-kit/auth  — 중앙 로그인 포털 (포트 3000, auth.lvh.me)
│  │   ├─ app/login/                  이메일 + 비밀번호 폼
│  │   └─ app/api/auth/[...all]/      동일 오리진 프록시 → 공유 Convex
│  └─ chat/            @sso-kit/chat  — 데모 소비자 앱 (포트 3001, chat.lvh.me)
│      ├─ app/protected/              로그인한 이메일을 보여 주는 보호 라우트
│      ├─ middleware.ts               미인증 시 → auth/login으로 리다이렉트
│      └─ app/api/auth/[...all]/      자기 자신의 동일 오리진 프록시
├─ packages/
│  └─ backend/         @sso-kit/backend — 단일 Convex 배포 = 중앙 세션 저장소
│      └─ convex/                     auth.ts (Better Auth), http.ts, convex.config.ts, rotateKeys
├─ SETUP.md            에이전트 런북 (8단계, 🚦 사람 전용 관문)
├─ AGENTS.md / CLAUDE.md   얇은 포인터: "SETUP.md를 따라가라"
└─ docs/               architecture-decision.md, poc-verification*.md, architecture-diagram.html
```

**하나의 세션이 동작하는 방식.** Better Auth는 Convex *안에서* 돌아갑니다. `createAuth()`는 `advanced.crossSubDomainCookies`를 켜고 `domain`을 `COOKIE_DOMAIN`(dev에서는 `lvh.me`)에서 가져와 설정하므로, 세션 쿠키는 공유 상위 도메인 범위로 지정되고 모든 서브도메인이 같은 세션을 읽습니다. 두 앱 모두 `NEXT_PUBLIC_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_SITE_URL`을 **같은** 배포로 향하게 합니다. 각 앱은 **자기 자신의** `/api/auth/[...all]` 라우트를 그 공유 배포로 프록시해 쿠키를 퍼스트파티로 유지합니다 — 동일 오리진, CORS 없음.

**고정된 버전** (이슈를 등록할 때 함께 적어주세요):

| | 버전 |
|---|---|
| Next.js | `^15.5.0` |
| React / React-DOM | `^19.1.0` |
| Convex | `^1.25.0` |
| `@convex-dev/better-auth` | `0.12.2` (정확히 고정 — 0.x, 1.0 이전) |
| `better-auth` | `~1.6.9` |
| Tailwind CSS | `^4.1.13` (`@tailwindcss/postcss`) |
| TypeScript | `^5.9.0` |
| Geist / clsx / tailwind-merge | `^1.5.1` / `^2.1.1` / `^3.3.1` |
| pnpm | `10.33.0` (`packageManager`로 고정) |
| Turbo | `^2.6.0` |

UI는 Tailwind v4와 Geist 폰트를 쓴 작은 shadcn 스타일 키트입니다(auth: `button`, `card`, `input`, `label`; chat: `button`, `card`). 이메일 + 비밀번호 인증은 `better-auth/react`의 `createAuthClient`와 `convexClient()` 플러그인을 사용합니다. 레포에는 `.agents/skills` / `.claude/skills` 아래에 Convex 에이전트 스킬도 함께 들어 있습니다.

## CLI가 하는 일 (그리고 하지 않는 일)

**하는 일** (결정적인 파일 작업만):

1. 고정된 태그의 `sso-kit` 템플릿을 내려받습니다 (`--ref`로 덮어쓸 수 있음).
2. `my-app/`에 풀어놓습니다 (아카이브의 최상위 디렉터리를 벗겨냄).
3. 루트 `package.json`의 `name`을 npm 안전 슬러그로 설정하고, `SETUP.md`의 `{{PROJECT_NAME}}`을 당신의 디렉터리 이름으로 치환합니다.
4. git을 다시 초기화하고(`git init -b main`) 초기 커밋 하나를 만듭니다. try/catch로 감싸져 있어 — git이 없어도 스캐폴딩은 그래도 성공하며 안내 메시지를 출력합니다.
5. 다음 단계 안내를 출력합니다.

**하지 않는 일**: 의존성 설치(`node_modules` 없음), Convex 로그인, 환경 변수 설정, `.env.local` 작성(`.env.example`은 그대로 보존), 도메인 선택, 실행, 그 어떤 검증도 하지 않습니다. 이 모든 것은 런북에 들어 있고 당신의 에이전트가 수행합니다 — [`sso-kit/SETUP.md`](https://github.com/NewTurn2017/sso-kit/blob/main/SETUP.md)를 참고하세요.

> 참고: `--pm`은 아무것도 설치하지 **않습니다** — 안내 문구 `(it'll use <pm>)`만 바꿉니다. CLI는 pnpm/npm/yarn을 절대 실행하지 않습니다.

> 슬러그 관련 미묘한 점: 디렉터리 이름은 그대로 유지되고(대소문자 보존) `SETUP.md`의 `{{PROJECT_NAME}}`에도 그 이름이 들어가지만, `package.json`의 `name`은 소문자로 바뀐 npm 안전 슬러그가 됩니다. 그래서 `My-App` → 디렉터리는 `My-App`, 패키지 이름은 `my-app`, `SETUP.md`에는 `My-App`이 적힙니다.

## 플래그

`create-sso-kit <project-name>` — `node:util`의 `parseArgs`로 파싱됩니다 (아래 외에 다른 플래그는 없음):

| 플래그 | 설명 | 기본값 |
|---|---|---|
| `[project-name]` | 위치 인자. 대상 디렉터리(그대로)이자, 소문자로 바꾼 패키지 이름. 생략하면 한 번 물어봅니다. | — (물어봄) |
| `--ref <tag>` | 스캐폴딩의 기준이 되는 `sso-kit` git 태그. | `v0.1.3` |
| `--pm <pnpm\|npm\|yarn>` | 출력되는 안내 문구에만 표시되는 패키지 매니저. 잘못된 값은 `--pm must be one of pnpm\|npm\|yarn (got "<x>")`를 던집니다. | `npm_config_user_agent`에서 자동 감지, 없으면 `pnpm` |

**프로젝트 이름 검증.** 이름은 trim된 뒤 다음 경우 거부됩니다 — 비어 있거나 공백뿐(`Project name is required.`); 정확히 `.` 또는 `..`; 경로 구분자(`/` 또는 `\`) 포함; 점으로 시작; 유도된 슬러그가 빈 경우; 슬러그가 214자(npm 최대)를 초과하는 경우. `create-sso-kit`은 또한 이미 **비어 있지 않은** 디렉터리에 스캐폴딩하기를 거부합니다 — `Target directory "<dir>" already exists and is not empty.`

**오류.** 던져진 오류는 모두 `✖ <message>` 형태로 stderr에 출력되며 종료 코드 `1`을 반환합니다.

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 회원가입 후 곧장 로그인으로 튕겨 돌아가고, SSO가 조용히 실패합니다. | `*.localhost`를 사용했습니다. Chrome은 `Set-Cookie … Domain=localhost`를 내보내더라도 `*.localhost` 서브도메인 간에 쿠키를 공유하지 **않습니다**. | `lvh.me`를 사용하세요. `auth.lvh.me` / `chat.lvh.me`와 함께 `COOKIE_DOMAIN=lvh.me`를 쓰면 같은 코드로 G1–G4가 통과합니다(Chrome이 `Domain=.lvh.me`로 저장). 이게 키트의 기본값이며 `/etc/hosts` 편집이 필요 없습니다. |
| `auth.lvh.me` / `chat.lvh.me`가 아예 해석되지 않습니다(앱이 뜨기도 전에 연결이 실패). | `lvh.me`는 외부 DNS에 의존합니다(`127.0.0.1`로 해석). DNS-rebind 보호, 일부 회사 리졸버, 또는 완전 오프라인 환경에서는 막힐 수 있습니다. | `/etc/hosts`에 `127.0.0.1 auth.lvh.me chat.lvh.me`를 추가하거나, 다른 loopback-wildcard 도메인을 사용하세요. |
| 미인증 리다이렉트가 `0.0.0.0`을 가리킵니다. | `next dev -H 0.0.0.0`에서는 `request.url`의 호스트가 `0.0.0.0`이 됩니다. | 키트에서 이미 해결됨: 미들웨어가 복귀 URL을 `request.url`이 아니라 `Host` 헤더 / 환경 변수에서 유도합니다. |
| 로그아웃 상태에서 로그인 페이지에 접속하면 `500`이 반환됩니다. | 세션이 없을 때 `getCurrentUser`가 예외를 던집니다. | 키트에서 이미 해결됨: 컴포넌트의 null-safe 경로를 사용합니다. |
| 인증 호출이 CORS preflight 차단으로 실패합니다. | 앱의 `authClient`가 auth 오리진을 직접 호출했습니다. | 각 앱의 `authClient`는 반드시 **자기 자신의** 동일 오리진 `/api/auth` 프록시를 거쳐야 합니다. 이 퍼스트파티 경계는 아키텍처의 핵심 규칙입니다. |
| 워크스페이스 패키지를 추가한 뒤 dev 서버가 Next 청크 `404`나 하이드레이션 실패를 던집니다. | `pnpm install`을 다시 돌리지 않고 dev 서버를 띄웠습니다. | `rm -rf .next && pnpm install` 후 재시작하세요. |
| `GET /api/auth/convex/token` → `Failed to decrypt private key`. | Better Auth는 `BETTER_AUTH_SECRET`으로 JWKS 키를 암호화합니다. 배포의 시크릿이 바뀌었거나 다른 값으로 재사용됐습니다. | betterAuth 컴포넌트의 `jwks` 테이블을 비우거나(Convex 대시보드) **또는** `npx convex run auth:rotateKeys`를 실행하세요. |
| `Target directory "<dir>" already exists and is not empty.` | 이미 파일이 있는 폴더에 스캐폴딩했습니다. | 새 이름을 고르거나 디렉터리를 비우세요. |
| 스캐폴딩 후 `git wasn't initialized` 안내가 표시됩니다. | `git`이 `PATH`에 없습니다. | 스캐폴딩은 성공했습니다. git을 설치하고 프로젝트에서 `git init`을 실행하세요. |

## 설계 방식

**얇은 CLI**와 **두꺼운 런북**의 조합이며, 이 분리는 의도적입니다:

- **이 CLI**는 고정된 템플릿 태그에서 파일만 스캐폴딩합니다. Convex·env·도메인에 대한 로직은 전혀 없습니다. 작게 유지하면 고장 나거나 유지보수할 거리가 거의 없습니다.
- **런북**(`sso-kit` 안에 들어 있는 `SETUP.md`)은 실제 설정 절차를 담고 있으며, 사람만 할 수 있는 지점을 명시한 에이전트 지침으로 작성돼 있습니다. 키트 README의 "빠른 시작"과 동일하게 맞춰져 있어 둘이 어긋나지 않습니다.
- **에이전트는 당신이 이미 쓰고 있는 그것입니다** — CLI에 내장된 LLM이 아니라, 런북을 읽는 당신의 Claude Code나 Codex 세션입니다. 덕분에 추가 API 키나 비용이 없고, 기존 흐름을 그대로 재사용하며, 에이전트 루프를 다시 구현할 필요가 없습니다. 갓 클론한 프로젝트를 돌아가게 만드는 일은 본질적으로 사람이 하거나 결정이 필요한 단계(대화형 Convex 로그인, 네 개의 env 값, 앱별 `.env.local`, 도메인 선택, 실행/검증)를 요구합니다 — 그래서 이것들은 스크립트로 짜기보다 위임됩니다.
- **런북은 CLI 없이도 유용합니다**: 그냥 `git clone`한 뒤 레포에서 Claude/Codex를 열면 똑같은 안내 절차가 시작됩니다.

이렇게 하면 CLI는 최소한으로 유지되고, 설정 지식은 그것이 설정하는 코드 바로 옆 한곳에 모입니다.

## 요구 사항

- **코딩 에이전트** — [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 또는 [Codex](https://github.com/openai/codex), 설치하고 인증된 상태여야 합니다. 안내 흐름 전체가 이걸 중심으로 짜여 있습니다 — 에이전트가 `SETUP.md`를 읽고 2–8단계를 수행합니다. ([전체 둘러보기](#full-walkthrough)를 통해 직접 키트를 돌릴 수도 있습니다.)
- CLI 실행에는 **Node ≥ 18** (전역 `fetch`, `node:util`의 `parseArgs`, `Readable.fromWeb`에 의존).
- **프로젝트: Node ≥ 18.18** (Node 20 LTS 권장) — Next.js 15용입니다. 어떤 `package.json`도 `engines` 필드를 선언하지 않으므로, Node 18.0–18.17은 명확한 버전 오류 대신 `pnpm dev`에서 실패합니다.
- 스캐폴딩된 프로젝트에는: [pnpm](https://pnpm.io) 10(`corepack enable`로 받을 수 있음)과 무료 [Convex](https://convex.dev) 계정(에이전트가 안내함).
- 5단계의 `BETTER_AUTH_SECRET`에는 **`openssl`** — 선택 사항이며, 32자 이상의 무작위 문자열이면 무엇이든 됩니다(둘러보기의 Node 대안 참고).
- 검증용: **Chromium 계열 브라우저**(서브도메인 간 쿠키 동작은 Chrome에서 검증됨)와 헤드리스 G3 확인을 위한 **`curl`**.

## 개발

```bash
pnpm install
pnpm test        # node:test suite via tsx (offline; uses a fixture tarball)
pnpm typecheck   # tsc --noEmit over src + test
pnpm build       # tsc → dist/ (published artifact)
pnpm dev         # tsx src/cli.ts  (run the CLI from source)
```

테스트는 완전히 오프라인으로 돌아갑니다: 픽스처 `.tar.gz`를 만들고 `CREATE_SSO_KIT_TEMPLATE_TGZ` 환경 변수(로컬 템플릿 이음새)로 CLI가 그것을 가리키게 하므로 네트워크를 쓰지 않습니다. 설정하지 않으면 CLI는 라이브 GitHub 태그 tarball을 받아옵니다.

런타임 의존성은 하나뿐입니다: `tar` (`^7.4.3`). 나머지는 모두 Node 표준 라이브러리입니다(`fetch`, `parseArgs`, `node:readline/promises`, `node:child_process`, `node:stream`).

프로젝트 구조:

```
src/
  args.ts        # CLI 인자 파싱 (--ref, --pm, 위치 인자)
  validate.ts    # 프로젝트 이름 검증 + npm 안전 슬러그
  customize.ts   # package.json name + SETUP.md {{PROJECT_NAME}} 주입
  template.ts    # 태그 tarball URL + 다운로드/추출 (최상위 디렉터리 제거)
  scaffold.ts    # 오케스트레이터 (오프라인 테스트용 주입형 IO)
  prompt.ts      # 이름 생략 시 한 번 묻는 readline 프롬프트
  cli.ts         # 엔트리 포인트 + 다음 단계 안내
test/            # 핵심 모듈별 테스트 파일 + 실제 bin CLI 테스트 (프롬프트 경로도 함께 커버)
```

## 라이선스

[MIT](LICENSE) © 2026 NewTurn2017
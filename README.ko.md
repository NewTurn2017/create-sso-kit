[English](README.md) · [한국어](README.ko.md)

# create-sso-kit

**서브도메인 통합 로그인(SSO)** 스타터 — [Next.js 15](https://nextjs.org) + [Convex](https://convex.dev) + [Better Auth](https://better-auth.com) — 를 스캐폴딩하고, 나머지 설정은 당신의 AI 코딩 에이전트가 대신 끝내도록 넘겨주는 도구입니다.

`create-sso-kit`은 얇은 스캐폴더입니다. 핀으로 고정된 [`sso-kit`](https://github.com/NewTurn2017/sso-kit) 템플릿을 받아 새 프로젝트에 풀어놓고 거기서 멈춥니다. 설정 중 결정이 필요하거나 사람만 할 수 있는 부분 — `pnpm install`, 대화형 Convex 로그인, 네 개의 `convex env set` 값, 앱별 `.env.local`, dev 도메인 선택, 실행/검증 — 은 함께 들어 있는 런북(`SETUP.md`)에 위임됩니다. 이 런북은 **이미 쓰고 있는 Claude Code 또는 Codex 에이전트가 한 단계씩 실행**하며, 꼭 필요한 곳(브라우저 로그인, 도메인 선택)에서만 멈춰 당신에게 묻습니다.

## 빠른 시작

```bash
pnpm create sso-kit my-app
# 또는:  npm create sso-kit@latest my-app
# 또는:  npx create-sso-kit my-app
```

그다음 나머지는 에이전트에게 맡깁니다:

```bash
cd my-app
claude          # 또는: codex
```

에이전트는 `AGENTS.md` / `CLAUDE.md`를 읽고 `SETUP.md`를 찾아, 키트 설정을 단계별로 안내합니다 — Convex 로그인과 dev 도메인 선택에서는 당신의 입력을 기다립니다.

## CLI가 하는 일 (그리고 하지 않는 일)

**하는 일** (결정적인 파일 작업만):

1. 핀으로 고정된 태그의 `sso-kit` 템플릿을 내려받습니다 (`--ref`로 변경 가능).
2. `my-app/`에 풀어놓습니다.
3. 루트 `package.json`의 `name`을 바꾸고, 프로젝트 이름을 `SETUP.md`에 주입합니다.
4. git을 다시 초기화하고(`git init -b main`) 초기 커밋 하나를 만듭니다.
5. 다음 단계 안내를 출력합니다.

**하지 않는 일**: 의존성 설치, Convex 로그인, 환경 변수 설정, `.env.local` 작성, 도메인 선택, 실행, 검증 — 이 모든 것은 런북에 들어 있고 당신의 에이전트가 수행합니다. [`sso-kit/SETUP.md`](https://github.com/NewTurn2017/sso-kit/blob/main/SETUP.md)를 참고하세요.

## 플래그

| 플래그 | 설명 | 기본값 |
|---|---|---|
| `[project-name]` | 위치 인자. 대상 디렉터리이자 패키지 이름. 생략하면 한 번 물어봅니다. | — |
| `--ref <tag>` | 스캐폴딩할 `sso-kit` 템플릿 태그. | `v0.1.2` |
| `--pm <pnpm\|npm\|yarn>` | 출력 안내에 표시할 패키지 매니저. | 자동 감지 |

## 설계 방식

**얇은 CLI**와 **두꺼운 런북**의 조합입니다:

- **이 CLI**는 핀으로 고정된 템플릿 태그에서 파일만 스캐폴딩합니다 — Convex·env·도메인에 대한 로직은 전혀 없습니다.
- **런북**(`sso-kit` 안에 들어 있는 `SETUP.md`)은 실제 설정 절차를 담고 있으며, 사람만 할 수 있는 지점을 명시한 에이전트 지침으로 작성돼 있습니다. 키트의 README "빠른 시작"과 같은 명령을 공유하므로 둘이 어긋나지 않습니다.

이렇게 하면 CLI는 작게 유지되고, 설정 지식은 그것이 설정하는 코드 바로 옆 한곳에 모입니다.

## 요구 사항

- CLI 실행에는 **Node ≥ 18** (전역 `fetch`, `node:util`의 `parseArgs`).
- 스캐폴딩된 프로젝트에는 [pnpm](https://pnpm.io) 10과 무료 [Convex](https://convex.dev) 계정 (에이전트가 안내합니다).

## 개발

```bash
pnpm install
pnpm test        # tsx로 node:test 실행 (오프라인; 픽스처 tarball 사용)
pnpm typecheck   # src + test에 대해 tsc --noEmit
pnpm build       # tsc → dist/ (배포 산출물)
```

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
test/            # 모듈별 테스트 파일 + 실제 bin CLI 테스트
```

## 라이선스

[MIT](LICENSE) © 2026 NewTurn2017

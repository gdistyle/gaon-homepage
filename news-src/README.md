# NEWS 페이지 원본 (사이트에 배포되지 않음)

- `news.json` = AI 소식, `biz.json` = 컨설팅 소식 (누적 보관(삭제하지 않음), 매주 10건 추가(AI 5 + 컨설팅 5))
- 항목 필드: date(YYYY-MM-DD), category, img(public/assets/img 안 이름, 확장자 제외), title, summary, body, comment(가온 코멘트), source, url
- AI 분류: 제조 AI / AX 정책 / 빅테크·모델 / 로봇·피지컬 AI
- 컨설팅 분류: 스마트공장 / 지원사업 공고 / ESG·공급망 / ISO·규제 / 수출·기타
- 고친 뒤 `python3 news-src/build_news.py` → `public/news.html` 다시 생성

## 섬네일 규칙 (저작권 문제 0 · 중복 금지 · 기사 관련 사진)
- **언론사·기관·기업 사진(기사 대표 사진 og:image 포함)은 절대 쓰지 않음** — 내려받기·직접 불러오기 모두 금지
- 쓸 수 있는 사진: Wikimedia Commons / Openverse의 자유 이용 사진만 — CC0, 퍼블릭 도메인, CC BY, CC BY-SA (NC·ND 금지)
- 사람 얼굴이 크게 나온 사진, 로고·상표가 주인공인 사진, 스크린샷, 표·그래프·글자 카드는 피함
- 960×600(16:10)으로 잘라 `public/assets/img/news/<기사id>.jpg`에 저장, `thumb='assets/img/news/<기사id>.jpg'`
- `credit` = "사진: 작가, 라이선스 (Wikimedia Commons)" — 반드시 기입(CC BY/BY-SA 표시 의무)
- 모든 기사(누적 전체)에서 사진이 겹치면 안 됨(같은 원본 파일 금지, 비슷한 장면도 피함)
- `img` = 사진이 안 열릴 때 대신 보일 사이트 사진(public/assets/img 이름)

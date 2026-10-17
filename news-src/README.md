# NEWS 페이지 원본 (사이트에 배포되지 않음)

- `news.json` = AI 소식, `biz.json` = 컨설팅 소식 (누적 보관(삭제하지 않음), 매주 10건 추가(AI 5 + 컨설팅 5))
- 항목 필드: date(YYYY-MM-DD), category, img(public/assets/img 안 이름, 확장자 제외), title, summary, body, comment(가온 코멘트), source, url
- AI 분류: 제조 AI / AX 정책 / 빅테크·모델 / 로봇·피지컬 AI
- 컨설팅 분류: 스마트공장 / 지원사업 공고 / ESG·공급망 / ISO·규제 / 수출·기타
- 고친 뒤 `python3 news-src/build_news.py` → `public/news.html` 다시 생성

## 섬네일 규칙 (중복 금지 · 기사 관련 사진)
- `thumb` = 기사 대표 사진 주소(og:image). 기사 페이지 `<meta property="og:image">`에서 가져옴 → 화면에서 원문 사진을 바로 불러옴
- 표·그래프·글자 카드·로고·기자/칼럼니스트 얼굴 사진·언론사 기본 이미지는 쓰지 않음
- 기사 사진이 부적합하면: 기사 안 다른 사진 → 없으면 Wikimedia Commons/Openverse의 자유 이용(CC BY/BY-SA/CC0, NC 금지) 관련 사진을 960×600으로 잘라 `public/assets/img/news/<id>.jpg`에 저장, `credit`에 "사진: 작가, 라이선스 (출처)" 기입
- 모든 기사(누적 전체)에서 `thumb`가 겹치면 안 됨. 같은 사진처럼 보이는 것(같은 자료사진)도 금지
- `img` = 원문 사진이 안 열릴 때 대신 보일 사이트 사진(public/assets/img 이름)

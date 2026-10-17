# NEWS 페이지 원본 (사이트에 배포되지 않음)

- `news.json` = AI 소식, `biz.json` = 컨설팅 소식 (누적 보관(삭제하지 않음), 매주 10건 추가(AI 5 + 컨설팅 5))
- 항목 필드: date(YYYY-MM-DD), category, img(public/assets/img 안 이름, 확장자 제외), title, summary, body, comment(가온 코멘트), source, url
- AI 분류: 제조 AI / AX 정책 / 빅테크·모델 / 로봇·피지컬 AI
- 컨설팅 분류: 스마트공장 / 지원사업 공고 / ESG·공급망 / ISO·규제 / 수출·기타
- 고친 뒤 `python3 news-src/build_news.py` → `public/news.html` 다시 생성

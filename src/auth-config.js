// 가온 통합 로그인 설정 — 공개 클라이언트 ID만 기록 (비밀키 없음)
export const AUTH = {
  google: { clientId: "246757106508-pgh0mq9r6bddgamoegbp2aqa4sjm9jdv.apps.googleusercontent.com" },
  naver: { clientId: "HoC02w2banoY2fcr3Ot6" },
  // 카카오: 앱 등록 후 REST API 키를 넣으면 버튼이 켜짐
  kakao: { restKey: "", jsKey: "", redirectUri: "https://gaonlab.gdistyle.workers.dev/login" },
  // 로그인 후 되돌아갈 수 있는 사이트
  allowedOrigins: [
    "https://gaonlab.gdistyle.workers.dev",
    "https://aom-law-review.gdistyle.workers.dev",
  ],
};

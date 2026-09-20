# 오늘 저녁 주문 웹앱

GitHub Pages + Supabase 기반의 사무실 저녁 주문 웹앱입니다.

## 구성
- 정적 호스팅: GitHub Pages
- 데이터베이스: Supabase Postgres
- API: Supabase Edge Function `meal-api`
- 브라우저에는 Supabase publishable key만 포함
- 관리자 PIN 검증은 서버 측에서 처리

## 기능
- 밥 당번이 오늘의 식당과 주문 마감시간 설정
- 구성원 이름 입력
- 메뉴 선택 및 요청사항 입력
- `오늘은 안 먹어요` 선택
- 주문자/미식사자 현황
- 메뉴별 주문 수량 집계
- 예상 주문금액 합계
- 5초 간격 자동 새로고침
- 같은 이름의 주문은 최초 주문 기기에 저장된 토큰으로만 수정 가능

## GitHub Pages 배포
1. 저장소 `Settings`
2. `Pages`
3. `Build and deployment` → `Deploy from a branch`
4. Branch `main`, Folder `/(root)`
5. Save

## Supabase
프로젝트에는 다음 리소스가 생성되어 있습니다.
- `meal_restaurants`
- `meal_menus`
- `meal_days`
- `meal_orders`
- `meal_admin_settings`
- Edge Function: `meal-api`


Pages deployment trigger: 2026-09-20

import urllib.request
import json
import urllib.parse
import datetime
import re
import sys

def get_meal_info(date_str):
    """
    나이스 API를 호출하여 자운고등학교의 급식 정보를 가져옵니다.
    """
    url = "https://open.neis.go.kr/hub/mealServiceDietInfo"
    # 자운고등학교 코드
    # ATPT_OFCDC_SC_CODE: B10 (서울시교육청)
    # SD_SCHUL_CODE: 7010703 (자운고등학교)
    params = {
        "Type": "json",
        "pIndex": 1,
        "pSize": 10,
        "ATPT_OFCDC_SC_CODE": "B10",
        "SD_SCHUL_CODE": "7010703",
        "MLSV_YMD": date_str
    }
    
    query_string = urllib.parse.urlencode(params)
    full_url = f"{url}?{query_string}"
    
    try:
        req = urllib.request.Request(full_url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # API 응답에서 급식 데이터가 있는지 확인
            if "mealServiceDietInfo" in data:
                rows = data["mealServiceDietInfo"][1]["row"]
                meals = []
                for row in rows:
                    meal_type = row["MMEAL_SC_NM"] # 조식, 중식, 석식
                    menu = row["DDISH_NM"]
                    
                    # 메뉴 데이터 정제하기
                    # 1. <br/> 태그를 줄바꿈으로 변경
                    menu = menu.replace("<br/>", "\n")
                    
                    # 2. 알레르기 유발 식품 정보 숫자 (예: (1.2.3.)) 제거
                    menu = re.sub(r'\([\d\.\s]+\)', '', menu)
                    
                    # 3. 불필요한 공백 제거
                    menu = "\n".join([line.strip() for line in menu.split("\n") if line.strip()])
                    
                    # 칼로리 정보
                    calories = row["CAL_INFO"]
                    
                    meals.append({
                        "type": meal_type,
                        "menu": menu,
                        "calories": calories
                    })
                return meals
            else:
                return None
    except Exception as e:
        print(f"네트워크 통신 중 오류가 발생했습니다: {e}")
        return None

def main():
    print("=" * 50)
    print(" 🏫 자운고등학교 급식 정보 조회 프로그램 ")
    print("=" * 50)
    
    while True:
        print("\n[ 메뉴 선택 ]")
        print("1. 오늘 급식")
        print("2. 내일 급식")
        print("3. 특정 날짜 조회 (예: 20240315)")
        print("0. 프로그램 종료")
        
        choice = input("선택해주세요 (0~3): ").strip()
        
        target_date = None
        date_display = ""
        
        if choice == '1':
            target_date = datetime.datetime.now()
            date_display = "오늘"
        elif choice == '2':
            target_date = datetime.datetime.now() + datetime.timedelta(days=1)
            date_display = "내일"
        elif choice == '3':
            date_input = input("조회할 날짜를 8자리로 입력하세요 (예: 20240501): ").strip()
            if len(date_input) == 8 and date_input.isdigit():
                try:
                    target_date = datetime.datetime.strptime(date_input, "%Y%m%d")
                    date_display = f"{target_date.strftime('%Y년 %m월 %d일')}"
                except ValueError:
                    print("❌ 잘못된 날짜입니다. 달력에 있는 올바른 날짜를 입력해주세요.")
                    continue
            else:
                print("❌ 8자리 숫자로 정확히 입력해주세요.")
                continue
        elif choice == '0':
            print("\n프로그램을 종료합니다. 좋은 하루 되세요! 👋")
            break
        else:
            print("❌ 올바른 번호를 선택해주세요.")
            continue
            
        date_str = target_date.strftime("%Y%m%d")
        print(f"\n⏳ [{date_display} ({date_str})] 급식 정보를 가져오는 중입니다...")
        
        meals = get_meal_info(date_str)
        
        print("\n" + "=" * 50)
        if not meals:
            print(" ❌ 해당 날짜의 급식 정보가 없습니다. (주말이거나 방학일 수 있습니다)")
        else:
            for meal in meals:
                print(f"  🍽️  [ {meal['type']} ]")
                print("-" * 50)
                # 메뉴 항목들의 띄어쓰기를 맞추기 위해 들여쓰기 추가
                for item in meal['menu'].split('\n'):
                    print(f"    • {item}")
                print("-" * 50)
                print(f"    ✨ 에너지: {meal['calories']}")
                print("=" * 50)

if __name__ == "__main__":
    main()

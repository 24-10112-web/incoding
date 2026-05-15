import urllib.request
import urllib.parse
import json
import datetime

def crawl_1year_gold_price():
    url = "https://koreagoldx.co.kr/api/price/chart/list"
    
    # 최근 1년 날짜 계산
    today = datetime.datetime.now()
    one_year_ago = today - datetime.timedelta(days=365)
    
    start_date = one_year_ago.strftime("%Y.%m.%d")
    end_date = today.strftime("%Y.%m.%d")
    
    # API 요청 헤더 (웹 브라우저에서 요청하는 것처럼 위장)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Origin": "https://koreagoldx.co.kr",
        "Referer": "https://koreagoldx.co.kr/price/gold"
    }
    
    # API 요청 페이로드
    payload = {
        "srchDt": "1Y",
        "type": "Au",
        "dataDateStart": start_date,
        "dataDateEnd": end_date
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    print(f"[{start_date} ~ {end_date}] 기간의 금 시세 데이터를 수집합니다...")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            parsed_data = json.loads(res_data)
            
            if "list" in parsed_data:
                prices = parsed_data["list"]
                print(f"총 {len(prices)}일치 데이터를 성공적으로 가져왔습니다!\n")
                
                # 데이터 출력 화면 포맷
                print(f"{'Date':<15} | {'내가 살 때 (원)':<15} | {'내가 팔 때 (원)':<15}")
                print("-" * 55)
                
                # 상위 5개 출력
                for item in prices[:5]:
                    print(f"{item.get('date'):<15} | {item.get('s_pure', 0):<15,} | {item.get('p_pure', 0):<15,}")
                print("      ...        |       ...       |       ...")
                
                # 하위 5개 출력
                for item in prices[-5:]:
                    print(f"{item.get('date'):<15} | {item.get('s_pure', 0):<15,} | {item.get('p_pure', 0):<15,}")
                
                # 리스트 리턴
                return prices
            else:
                print("데이터 내에서 'list' 구조를 찾을 수 없습니다.")
    except Exception as e:
        print(f"오류가 발생했습니다: {e}")

if __name__ == "__main__":
    crawl_1year_gold_price()

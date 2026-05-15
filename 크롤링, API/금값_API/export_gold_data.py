import urllib.request
import urllib.parse
import json
import datetime
import os

import matplotlib.pyplot as plt
from matplotlib import font_manager, rc
from openpyxl import Workbook
from openpyxl.drawing.image import Image as ExcelImage

# 윈도우 맑은 고딕 폰트 적용 (한글 깨짐 방지)
rc('font', family='Malgun Gothic')
plt.rcParams['axes.unicode_minus'] = False

def export_gold_data_to_excel():
    url = "https://koreagoldx.co.kr/api/price/chart/list"
    
    today = datetime.datetime.now()
    one_year_ago = today - datetime.timedelta(days=365)
    
    start_date = one_year_ago.strftime("%Y.%m.%d")
    end_date = today.strftime("%Y.%m.%d")
    
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Origin": "https://koreagoldx.co.kr",
        "Referer": "https://koreagoldx.co.kr/price/gold"
    }
    
    payload = {
        "srchDt": "1Y",
        "type": "Au",
        "dataDateStart": start_date,
        "dataDateEnd": end_date
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            parsed_data = json.loads(res_data)
            
            if "list" in parsed_data:
                prices = parsed_data["list"]
                
                png_filename = "gold_price_1year.png"
                xlsx_filename = "gold_price_1year_with_graph.xlsx"
                
                print(f"데이터 {len(prices)}건을 가져왔습니다. 엑셀 파일과 그래프를 생성합니다...")

                # --- 1. PNG 시각화 그래프 저장 ---
                prices_reversed = list(reversed(prices))
                daily_prices = {}
                for item in prices_reversed:
                    dt_str = item.get('date', '').split(' ')[0]
                    if dt_str not in daily_prices:
                        daily_prices[dt_str] = {
                            "buy": item.get('s_pure', 0),
                            "sell": item.get('p_pure', 0)
                        }
                
                dates = list(daily_prices.keys())
                buy_prices = [val["buy"] for val in daily_prices.values()]
                sell_prices = [val["sell"] for val in daily_prices.values()]
                
                plt.figure(figsize=(10, 5))
                plt.plot(dates, buy_prices, label="내가 살 때", color='tab:blue', linewidth=2)
                plt.plot(dates, sell_prices, label="내가 팔 때", color='tab:orange', linewidth=2)
                
                plt.title("최근 1년 한국금거래소 금 시세 변동", fontsize=16, pad=15)
                plt.xlabel("날짜", fontsize=12)
                plt.ylabel("금액 (원)", fontsize=12)
                
                n_ticks = len(dates)
                step = max(1, n_ticks // 12)
                plt.xticks(dates[::step], rotation=45)
                
                current_values = plt.gca().get_yticks()
                plt.gca().set_yticklabels(['{:,.0f}'.format(x) for x in current_values])
                
                plt.legend(loc='upper left')
                plt.grid(True, linestyle='--', alpha=0.6)
                plt.tight_layout()
                plt.savefig(png_filename, dpi=200) # 용량 최적화를 위해 200dpi
                plt.close() # 메모리 해제
                
                # --- 2. 엑셀(XLSX) 파일 생성 및 데이터/이미지 삽입 ---
                wb = Workbook()
                ws = wb.active
                ws.title = "금 시세 1년 기록"
                
                # 열 너비 설정
                ws.column_dimensions['A'].width = 25
                ws.column_dimensions['B'].width = 15
                ws.column_dimensions['C'].width = 15

                # 헤더 작성
                ws.append(['고시날짜(시간포함)', '내가 살 때 (원)', '내가 팔 때 (원)'])
                
                # 데이터 작성
                for item in prices:
                    ws.append([
                        item.get('date', ''), 
                        item.get('s_pure', 0), 
                        item.get('p_pure', 0)
                    ])
                
                # 미리 만들어둔 PNG 그래프 이미지를 엑셀의 "E2" 셀 위치에 삽입
                img = ExcelImage(png_filename)
                ws.add_image(img, "E2")
                
                wb.save(xlsx_filename)
                print(f"[완료] 엑셀 파일 저장 완료 (이미지 포함): {xlsx_filename}")

            else:
                print("데이터를 찾을 수 없습니다.")
    except Exception as e:
        print(f"오류가 발생했습니다: {e}")

if __name__ == "__main__":
    export_gold_data_to_excel()

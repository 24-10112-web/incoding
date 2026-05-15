using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace GoldCrawlerApp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            await Crawl1YearGoldPriceAsync();
        }

        static async Task Crawl1YearGoldPriceAsync()
        {
            string url = "https://koreagoldx.co.kr/api/price/chart/list";

            // 최근 1년 날짜 계산
            DateTime today = DateTime.Now;
            DateTime oneYearAgo = today.AddYears(-1);

            string startDate = oneYearAgo.ToString("yyyy.MM.dd");
            string endDate = today.ToString("yyyy.MM.dd");

            using (HttpClient client = new HttpClient())
            {
                // API 요청 헤더 설정 (웹 브라우저인 것처럼 위장)
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                client.DefaultRequestHeaders.Add("Accept", "application/json, text/javascript, */*; q=0.01");
                client.DefaultRequestHeaders.Add("Origin", "https://koreagoldx.co.kr");
                client.DefaultRequestHeaders.Add("Referer", "https://koreagoldx.co.kr/price/gold");

                // API 요청 페이로드
                var payload = new
                {
                    srchDt = "1Y",
                    type = "Au",
                    dataDateStart = startDate,
                    dataDateEnd = endDate
                };

                // JSON Serialize
                string jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                Console.WriteLine($"[{startDate} ~ {endDate}] 기간의 금 시세 데이터를 수집합니다...");

                try
                {
                    // POST 요청 전송
                    HttpResponseMessage response = await client.PostAsync(url, content);
                    response.EnsureSuccessStatusCode(); // HTTP 코드가 성공(2xx)인지 확인

                    string responseBody = await response.Content.ReadAsStringAsync();
                    
                    // JSON 응답 파싱
                    using (JsonDocument doc = JsonDocument.Parse(responseBody))
                    {
                        // "list" 키 배열 값 추출
                        if (doc.RootElement.TryGetProperty("list", out JsonElement listElement) && listElement.ValueKind == JsonValueKind.Array)
                        {
                            int count = listElement.GetArrayLength();
                            Console.WriteLine($"총 {count}개의 기록을 성공적으로 가져왔습니다!\n");

                            Console.WriteLine($"{"Date",-15} | {"내가 살 때 (원)",-15} | {"내가 팔 때 (원)",-15}");
                            Console.WriteLine(new string('-', 55));

                            // 상위 5개, 하위 5개 출력을 위한 로직
                            int index = 0;
                            foreach (JsonElement item in listElement.EnumerateArray())
                            {
                                if (index < 5 || index >= count - 5)
                                {
                                    string date = item.TryGetProperty("date", out JsonElement dateEl) ? dateEl.GetString() : "";
                                    
                                    long sPure = 0;
                                    if (item.TryGetProperty("s_pure", out JsonElement sPureEl) && sPureEl.ValueKind == JsonValueKind.Number)
                                        sPure = sPureEl.GetInt64();

                                    long pPure = 0;
                                    if (item.TryGetProperty("p_pure", out JsonElement pPureEl) && pPureEl.ValueKind == JsonValueKind.Number)
                                        pPure = pPureEl.GetInt64();

                                    Console.WriteLine($"{date,-15} | {sPure,-15:N0} | {pPure,-15:N0}");
                                }
                                else if (index == 5)
                                {
                                    Console.WriteLine($"{"      ...",-15} | {"      ...",-15} | {"      ...",-15}");
                                }
                                index++;
                            }

                            // CSV 파일로 저장
                            string csvFilePath = "gold_price_1year.csv";
                            var csvContent = new StringBuilder();
                            // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
                            csvContent.Append('\uFEFF');
                            csvContent.AppendLine("고시날짜,내가 살 때 (원),내가 팔 때 (원)");

                            foreach (JsonElement item in listElement.EnumerateArray())
                            {
                                string date = item.TryGetProperty("date", out JsonElement dateEl) ? dateEl.GetString() : "";
                                long sPure = item.TryGetProperty("s_pure", out JsonElement sPureEl) && sPureEl.ValueKind == JsonValueKind.Number ? sPureEl.GetInt64() : 0;
                                long pPure = item.TryGetProperty("p_pure", out JsonElement pPureEl) && pPureEl.ValueKind == JsonValueKind.Number ? pPureEl.GetInt64() : 0;

                                csvContent.AppendLine($"{date},{sPure},{pPure}");
                            }

                            System.IO.File.WriteAllText(csvFilePath, csvContent.ToString(), new UTF8Encoding(true));
                            Console.WriteLine($"\n[완료] 데이터가 CSV 파일로 저장되었습니다: {System.IO.Path.GetFullPath(csvFilePath)}");
                        }
                        else
                        {
                            Console.WriteLine("데이터 내에서 'list' 배열 구조를 찾을 수 없습니다.");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"오류가 발생했습니다: {ex.Message}");
                }
            }
        }
    }
}

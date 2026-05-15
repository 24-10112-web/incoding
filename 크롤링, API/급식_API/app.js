document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentDate = new Date();
    let monthlyData = {}; // { '20260501': [...] }
    
    // DOM Elements
    const monthDisplay = document.getElementById('month-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    
    // Modal DOM Elements
    const modal = document.getElementById('meal-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalDate = document.getElementById('modal-date');
    const modalBody = document.getElementById('modal-body');

    // Constants for API
    const ATPT_OFCDC_SC_CODE = 'B10';
    const SD_SCHUL_CODE = '7010703';
    
    // Format Date for Display (e.g. 2026년 5월)
    const formatMonthDisplay = (date) => {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    };

    // Parse YYYYMMDD to human readable specific date
    const parseYMD = (ymdStr) => {
        const year = ymdStr.substring(0, 4);
        const month = parseInt(ymdStr.substring(4, 6), 10);
        const day = parseInt(ymdStr.substring(6, 8), 10);
        return `${year}년 ${month}월 ${day}일`;
    };

    // Get First Day and Last Day of the month
    const getMonthRange = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0); // 0th day of next month is last day of current
        
        const formatStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}${m}${day}`;
        };
        
        return {
            fromDate: formatStr(firstDay),
            toDate: formatStr(lastDay),
            firstDayOfWeek: firstDay.getDay(),
            daysInMonth: lastDay.getDate()
        };
    };

    // Process Menu Text to extract names and allergy info
    const processMenu = (rawMenu) => {
        let items = rawMenu.replace(/<br\s*\/?>/gi, '\n').split('\n');
        
        return items.map(item => {
            const match = item.match(/\(([\d\.\s]+)\)/);
            let name = item;
            let allergies = [];

            if (match) {
                const allergyStr = match[1];
                allergies = allergyStr.split('.')
                    .map(a => a.trim())
                    .filter(a => a.length > 0 && !isNaN(a));
                name = item.replace(/\([\d\.\s]+\)/g, '').trim();
            } else {
                name = item.trim();
            }

            return { name, allergies };
        }).filter(item => item.name.length > 0);
    };

    // Open Modal
    const openModal = (ymdStr, meals) => {
        modalDate.textContent = parseYMD(ymdStr);
        let html = '';
        
        meals.forEach((meal, index) => {
            const menuProcessed = processMenu(meal.DDISH_NM);
            const menuHtml = menuProcessed.map(item => {
                let badgeHtml = '';
                if (item.allergies.length > 0) {
                    badgeHtml = `<span class="allergy-badge" title="알러지: ${item.allergies.join(', ')}">${item.allergies.join(', ')}</span>`;
                }
                return `<li><span>${item.name}</span> ${badgeHtml}</li>`;
            }).join('');
            
            html += `
                <div class="meal-card" style="animation-delay: ${index * 0.1}s; animation: slideUp 0.4s ease forwards; opacity: 0; transform: translateY(20px);">
                    <h3 class="meal-type">${meal.MMEAL_SC_NM}</h3>
                    <ul class="meal-menu">
                        ${menuHtml}
                    </ul>
                    <div class="meal-calories">
                        ⚡ 총 열량: ${meal.CAL_INFO}
                    </div>
                </div>
            `;
        });
        
        // Add dynamic CSS for animation since we inline it
        const style = document.createElement('style');
        style.innerHTML = `@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(style);
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
    };

    // Close Modal
    const closeModal = () => {
        modal.classList.remove('active');
    };

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Render Calendar Grid
    const renderCalendar = (dateInfo, mealsData) => {
        calendarGrid.innerHTML = '';
        
        const todayItem = new Date();
        const isCurrentMonth = (todayItem.getFullYear() === currentDate.getFullYear() && 
                               todayItem.getMonth() === currentDate.getMonth());
        const todayDate = todayItem.getDate();

        // 1. 빈 칸 추가 (첫 번째 일 이전)
        for (let i = 0; i < dateInfo.firstDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        // 2. 날짜 채우기
        for (let day = 1; day <= dateInfo.daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            
            // 일요일 빨간색, 토요일 파란색
            const currentDayOfWeek = (dateInfo.firstDayOfWeek + day - 1) % 7;
            let dateNumClass = 'date-num';
            if (currentDayOfWeek === 0) dateNumClass += ' sun';
            if (currentDayOfWeek === 6) dateNumClass += ' sat';
            
            if (isCurrentMonth && day === todayDate) {
                cell.classList.add('today');
            }

            const ymdStr = `${dateInfo.fromDate.substring(0,6)}${String(day).padStart(2,'0')}`;
            const dayMeals = mealsData[ymdStr];

            let contentHtml = `<div class="${dateNumClass}">${day}</div>`;

            if (dayMeals && dayMeals.length > 0) {
                cell.classList.add('clickable');
                
                // Show a short preview (e.g. 중식의 첫 2개 메뉴만)
                let previewHtml = '';
                
                // 조식/중식/석식 중 중식이 있으면 우선적으로 썸네일에 띄우기
                let targetMeal = dayMeals.find(m => m.MMEAL_SC_NM === '중식') || dayMeals[0];
                
                if (targetMeal) {
                    const menuProcessed = processMenu(targetMeal.DDISH_NM);
                    // 최대 2개의 항목만 잘라서 표시
                    const maxItems = Math.min(2, menuProcessed.length);
                    for(let i=0; i < maxItems; i++) {
                        previewHtml += `<div class="mini-meal">· ${menuProcessed[i].name}</div>`;
                    }
                    if(menuProcessed.length > 2 || dayMeals.length > 1) {
                        previewHtml += `<div class="mini-meal" style="color:var(--primary)">+ 더보기</div>`;
                    }
                }
                contentHtml += previewHtml;

                cell.addEventListener('click', () => openModal(ymdStr, dayMeals));
            }

            cell.innerHTML = contentHtml;
            calendarGrid.appendChild(cell);
        }
    };

    // Group raw API response by date
    const groupMealsByDate = (rawRows) => {
        const grouped = {};
        rawRows.forEach(row => {
            const date = row.MLSV_YMD;
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(row);
        });
        return grouped;
    };

    // Fetch Date
    const fetchMonthlyData = async (date) => {
        monthDisplay.textContent = formatMonthDisplay(date);
        calendarGrid.innerHTML = `<div class="loader-message">이번 달 급식 정보를 불러오는 중입니다... 🔄</div>`;
        
        const dateInfo = getMonthRange(date);
        
        // pSize를 100정도로 늘려서 한 달치 데이터(하루 최대 3번 * 31 = 최대 93)를 한번에 가져옴
        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_FROM_YMD=${dateInfo.fromDate}&MLSV_TO_YMD=${dateInfo.toDate}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            let groupedMeals = {};
            if (data.mealServiceDietInfo && data.mealServiceDietInfo[1].row) {
                groupedMeals = groupMealsByDate(data.mealServiceDietInfo[1].row);
            }
            
            renderCalendar(dateInfo, groupedMeals);
        } catch (error) {
            console.error("API Fetch Error:", error);
            calendarGrid.innerHTML = `<div class="loader-message" style="color:#ef4444;">오류가 발생했습니다. 잠시 후 시도해주세요.</div>`;
        }
    };

    // Event Listeners for Nav
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        fetchMonthlyData(currentDate);
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        fetchMonthlyData(currentDate);
    });

    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        fetchMonthlyData(currentDate);
    });

    // Handle Escape key to close modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Initial Load
    fetchMonthlyData(currentDate);
});

class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.events = {};
        this.selectedDate = null;
        this.token = localStorage.getItem('token');
        this.username = localStorage.getItem('username');
        
        this.init();
    }

    init() {
        this.bindEvents();
        if (this.token) {
            this.showCalendar();
            this.loadEvents();
        } else {
            this.showAuth();
        }
    }

    bindEvents() {
        // 认证相关事件
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.register());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // 日历导航
        document.getElementById('prev-month').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.navigateMonth(1));

        // 模态框相关
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('add-event-btn').addEventListener('click', () => this.addEvent());
        
        // 新事件输入
        const newEventInput = document.getElementById('new-event-input');
        newEventInput.addEventListener('input', () => this.updateCharCount());
        newEventInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addEvent();
        });

        // 点击模态框外部关闭
        document.getElementById('event-modal').addEventListener('click', (e) => {
            if (e.target.id === 'event-modal') this.closeModal();
        });
    }

    // 认证相关方法
    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('calendar-container').classList.add('hidden');
    }

    showCalendar() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('calendar-container').classList.remove('hidden');
        document.getElementById('username-display').textContent = this.username;
        this.renderCalendar();
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        this.clearAuthError();
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        this.clearAuthError();
    }

    async login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showAuthError('ユーザー名とパスワードを入力してください');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.username = data.username;
                localStorage.setItem('token', this.token);
                localStorage.setItem('username', this.username);
                this.showCalendar();
                this.loadEvents();
            } else {
                this.showAuthError(data.error);
            }
        } catch (error) {
            this.showAuthError('ログインに失敗しました');
        }
    }

    async register() {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        if (!username || !password) {
            this.showAuthError('ユーザー名とパスワードを入力してください');
            return;
        }

        if (password.length < 6) {
            this.showAuthError('パスワードは6文字以上で入力してください');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.username = data.username;
                localStorage.setItem('token', this.token);
                localStorage.setItem('username', this.username);
                this.showCalendar();
                this.loadEvents();
            } else {
                this.showAuthError(data.error);
            }
        } catch (error) {
            this.showAuthError('登録に失敗しました');
        }
    }

    logout() {
        this.token = null;
        this.username = null;
        this.events = {};
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.showAuth();
    }

    showAuthError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    clearAuthError() {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    }

    // 日历相关方法
    renderCalendar() {
        this.updateMonthHeader();
        this.renderCalendarGrid();
    }

    updateMonthHeader() {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const monthHeader = document.getElementById('current-month');
        monthHeader.textContent = `${this.currentDate.getFullYear()}年 ${months[this.currentDate.getMonth()]}`;
    }

    renderCalendarGrid() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1).getDay();

        // 空白天数
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            grid.appendChild(emptyDay);
        }

        // 月份天数
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(day);
            grid.appendChild(dayElement);
        }
    }

    createDayElement(day) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dateKey = this.formatDateKey(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, day);
        const isToday = this.isToday(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        
        if (isToday) {
            dayElement.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        const eventsPreview = document.createElement('div');
        eventsPreview.className = 'events-preview';
        
        const dayEvents = this.events[dateKey] || [];
        dayEvents.slice(0, 4).forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.textContent = event.event;
            eventsPreview.appendChild(eventItem);
        });

        if (dayEvents.length > 4) {
            const moreEvents = document.createElement('div');
            moreEvents.className = 'more-events';
            moreEvents.textContent = `+${dayEvents.length - 4}件`;
            eventsPreview.appendChild(moreEvents);
        }

        dayElement.appendChild(eventsPreview);
        dayElement.addEventListener('click', () => this.openModal(day, dateKey));

        return dayElement;
    }

    formatDateKey(year, month, day) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year && 
               today.getMonth() === month && 
               today.getDate() === day;
    }

    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
        this.closeModal();
    }

    // 模态框相关方法
    openModal(day, dateKey) {
        this.selectedDate = { day, dateKey };
        
        const modalDate = document.getElementById('modal-date');
        modalDate.textContent = `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月${day}日`;
        
        this.renderEventsList();
        this.updateAddEventSection();
        
        document.getElementById('event-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('event-modal').classList.add('hidden');
        this.selectedDate = null;
        document.getElementById('new-event-input').value = '';
        this.updateCharCount();
    }

    renderEventsList() {
        const eventsList = document.getElementById('events-list');
        eventsList.innerHTML = '';

        const dayEvents = this.events[this.selectedDate.dateKey] || [];
        
        if (dayEvents.length === 0) {
            eventsList.innerHTML = '<p style="color: #9ca3af; text-align: center;">予定がありません</p>';
            return;
        }

        dayEvents.forEach((event, index) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-list-item';
            
            const eventText = document.createElement('span');
            eventText.className = 'event-text';
            eventText.textContent = `${event.start_time}${event.end_time ? '～' + event.end_time : ''} ${event.event}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-event';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', () => this.deleteEvent(event.id));
            
            eventItem.appendChild(eventText);
            eventItem.appendChild(deleteBtn);
            eventsList.appendChild(eventItem);
        });
    }

    updateAddEventSection() {
        const addEventSection = document.getElementById('add-event-section');
        addEventSection.classList.remove('hidden');
    }

    updateCharCount() {
        const input = document.getElementById('new-event-input');
        const charCount = document.getElementById('char-count');
        charCount.textContent = `${input.value.length}/16 文字`;
        
        const addBtn = document.getElementById('add-event-btn');
        addBtn.disabled = !input.value.trim() || input.value.length > 16;
    }

    async addEvent() {
        const input = document.getElementById('new-event-input');
        const startTime = document.getElementById('event-start-time');
        const endTime = document.getElementById('event-end-time');
        const eventText = input.value.trim();
        
        if (!eventText || eventText.length > 16 || !startTime.value) return;

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    date: this.selectedDate.dateKey,
                    event: eventText,
                    startTime: startTime.value,
                    endTime: endTime.value || null
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (!this.events[this.selectedDate.dateKey]) {
                    this.events[this.selectedDate.dateKey] = [];
                }
                this.events[this.selectedDate.dateKey].push(data);
                
                input.value = '';
                this.updateCharCount();
                this.renderEventsList();
                this.updateAddEventSection();
                this.renderCalendar();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('予定の追加に失敗しました');
        }
    }

    async deleteEvent(eventId) {
        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.events[this.selectedDate.dateKey] = this.events[this.selectedDate.dateKey]
                    .filter(event => event.id !== eventId);
                
                this.renderEventsList();
                this.updateAddEventSection();
                this.renderCalendar();
            } else {
                alert('予定の削除に失敗しました');
            }
        } catch (error) {
            alert('予定の削除に失敗しました');
        }
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/events', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const events = await response.json();
                this.events = {};
                
                events.forEach(event => {
                    if (!this.events[event.date]) {
                        this.events[event.date] = [];
                    }
                    this.events[event.date].push(event);
                });
                
                this.renderCalendar();
            }
        } catch (error) {
            console.error('イベントの読み込みに失敗しました:', error);
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new CalendarApp();
});

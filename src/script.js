class StudyPlanner {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('studyPlannerTasks')) || [];
        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderDashboard();
        this.renderTasks();
        this.renderCalendar();
        this.populateSubjectFilter();
        this.checkReminders();
        
        // Set minimum date to today
        document.getElementById('task-date').min = new Date().toISOString().split('T')[0];
        
        // Check reminders every minute
        setInterval(() => this.checkReminders(), 60000);
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => this.addTask(e));

        // Subject selection
        document.getElementById('task-subject').addEventListener('change', (e) => {
            const customSubject = document.getElementById('custom-subject');
            customSubject.style.display = e.target.value === 'Other' ? 'block' : 'none';
        });

        // Filters
        document.getElementById('subject-filter').addEventListener('change', () => this.renderTasks());
        document.getElementById('status-filter').addEventListener('change', () => this.renderTasks());

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // Refresh content if needed
        if (tabName === 'dashboard') this.renderDashboard();
        if (tabName === 'tasks') this.renderTasks();
        if (tabName === 'calendar') this.renderCalendar();
    }

    addTask(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskName = document.getElementById('task-name').value.trim();
        const taskSubject = document.getElementById('task-subject').value;
        const customSubject = document.getElementById('custom-subject').value.trim();
        const taskDate = document.getElementById('task-date').value;
        const taskTime = document.getElementById('task-time').value;
        const taskDuration = document.getElementById('task-duration').value;
        const taskPriority = document.getElementById('task-priority').value;
        const taskNotes = document.getElementById('task-notes').value.trim();

        if (!taskName || !taskDate || (!taskSubject && !customSubject)) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const task = {
            id: Date.now().toString(),
            name: taskName,
            subject: taskSubject === 'Other' ? customSubject : taskSubject,
            date: taskDate,
            time: taskTime || '23:59',
            duration: taskDuration || 1,
            priority: taskPriority,
            notes: taskNotes,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.showNotification('Task added successfully!');
        
        // Reset form and switch to tasks tab
        e.target.reset();
        document.getElementById('custom-subject').style.display = 'none';
        this.switchTab('tasks');
    }

    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.renderDashboard();
            this.showNotification(task.completed ? 'Task completed!' : 'Task marked as pending');
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.renderDashboard();
            this.showNotification('Task deleted');
        }
    }

    renderDashboard() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const overdueTasks = this.tasks.filter(t => !t.completed && this.isOverdue(t)).length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('overdue-tasks').textContent = overdueTasks;

        // Progress bar
        const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
        document.getElementById('progress-text').textContent = `${progressPercentage}% Complete`;

        // Upcoming tasks
        this.renderUpcomingTasks();
    }

    renderUpcomingTasks() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const upcomingTasks = this.tasks
            .filter(t => !t.completed && new Date(t.date) >= today && new Date(t.date) <= nextWeek)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);

        const container = document.getElementById('upcoming-tasks');
        
        if (upcomingTasks.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No upcoming tasks</p>';
            return;
        }

        container.innerHTML = upcomingTasks.map(task => {
            const dueDate = new Date(task.date);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="task-item ${this.isOverdue(task) ? 'overdue' : ''}">
                    <div class="task-header">
                        <div>
                            <div class="task-title">${task.name}</div>
                            <span class="task-subject">${task.subject}</span>
                        </div>
                        <div class="priority-indicator priority-${task.priority}"></div>
                    </div>
                    <div class="task-details">
                        <div><strong>Due:</strong> ${this.formatDate(task.date)} ${task.time}</div>
                        <div><strong>Days left:</strong> ${daysUntilDue === 0 ? 'Today' : `${daysUntilDue} days`}</div>
                        <div><strong>Duration:</strong> ${task.duration} hours</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTasks() {
        const subjectFilter = document.getElementById('subject-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        
        let filteredTasks = this.tasks;
        
        if (subjectFilter !== 'all') {
            filteredTasks = filteredTasks.filter(t => t.subject === subjectFilter);
        }
        
        if (statusFilter !== 'all') {
            if (statusFilter === 'completed') {
                filteredTasks = filteredTasks.filter(t => t.completed);
            } else if (statusFilter === 'pending') {
                filteredTasks = filteredTasks.filter(t => !t.completed && !this.isOverdue(t));
            } else if (statusFilter === 'overdue') {
                filteredTasks = filteredTasks.filter(t => !t.completed && this.isOverdue(t));
            }
        }

        // Sort tasks: overdue first, then by date
        filteredTasks.sort((a, b) => {
            if (!a.completed && this.isOverdue(a) && (!b.completed && !this.isOverdue(b))) return -1;
            if (!b.completed && this.isOverdue(b) && (!a.completed && !this.isOverdue(a))) return 1;
            return new Date(a.date) - new Date(b.date);
        });

        const container = document.getElementById('tasks-list');
        
        if (filteredTasks.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No tasks found</p>';
            return;
        }

        container.innerHTML = filteredTasks.map(task => {
            const isOverdue = this.isOverdue(task);
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                    <div class="task-header">
                        <div>
                            <div class="task-title">${task.name}</div>
                            <span class="task-subject">${task.subject}</span>
                        </div>
                        <div class="priority-indicator priority-${task.priority}"></div>
                    </div>
                    <div class="task-details">
                        <div><strong>Due:</strong> ${this.formatDate(task.date)} ${task.time}</div>
                        <div><strong>Duration:</strong> ${task.duration} hours</div>
                        <div><strong>Priority:</strong> ${task.priority}</div>
                        <div><strong>Status:</strong> ${task.completed ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}</div>
                    </div>
                    ${task.notes ? `<div style="margin: 10px 0; color: #666;"><strong>Notes:</strong> ${task.notes}</div>` : ''}
                    <div class="task-actions">
                        <button class="task-btn complete-btn" onclick="planner.completeTask('${task.id}')">
                            ${task.completed ? 'Mark Pending' : 'Complete'}
                        </button>
                        <button class="task-btn delete-btn" onclick="planner.deleteTask('${task.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Set header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const grid = document.getElementById('calendar-grid');
        
        let html = '';
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            html += `<div class="calendar-day" style="background: #667eea; color: white; font-weight: bold;">${day}</div>`;
        });

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const dayTasks = this.tasks.filter(t => t.date === dateString);
            
            let classes = 'calendar-day';
            if (date.toDateString() === today.toDateString()) classes += ' today';
            if (dayTasks.length > 0) classes += ' has-tasks';

            const taskDots = dayTasks.slice(0, 3).map(task => 
                `<div class="task-dot" style="background: ${this.getPriorityColor(task.priority)}"></div>`
            ).join('');

            html += `
                <div class="${classes}">
                    ${day}
                    ${taskDots ? `<div class="task-dots">${taskDots}</div>` : ''}
                </div>
            `;
        }

        // Next month days
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        grid.innerHTML = html;
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    populateSubjectFilter() {
        const subjects = [...new Set(this.tasks.map(t => t.subject))].sort();
        const filter = document.getElementById('subject-filter');
        
        // Keep the "All Subjects" option and add unique subjects
        filter.innerHTML = '<option value="all">All Subjects</option>';
        subjects.forEach(subject => {
            filter.innerHTML += `<option value="${subject}">${subject}</option>`;
        });
    }

    checkReminders() {
        const now = new Date();
        const upcoming = this.tasks.filter(task => {
            if (task.completed) return false;
            
            const taskDateTime = new Date(`${task.date}T${task.time}`);
            const timeDiff = taskDateTime - now;
            
            // Remind 24 hours before and 1 hour before
            return (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000) || 
                   (timeDiff > 0 && timeDiff <= 60 * 60 * 1000);
        });

        upcoming.forEach(task => {
            const taskDateTime = new Date(`${task.date}T${task.time}`);
            const timeDiff = taskDateTime - now;
            const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60));
            
            if (hoursLeft === 24) {
                this.showNotification(`Reminder: "${task.name}" is due in 24 hours!`, 'warning');
            } else if (hoursLeft === 1) {
                this.showNotification(`Urgent: "${task.name}" is due in 1 hour!`, 'error');
            }
        });
    }

    isOverdue(task) {
        if (task.completed) return false;
        const now = new Date();
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        return taskDateTime < now;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getPriorityColor(priority) {
        const colors = {
            high: '#f44336',
            medium: '#ff9800',
            low: '#4caf50'
        };
        return colors[priority] || colors.medium;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    saveTasks() {
        localStorage.setItem('studyPlannerTasks', JSON.stringify(this.tasks));
        this.populateSubjectFilter();
    }
}

// Initialize the application
const planner = new StudyPlanner();
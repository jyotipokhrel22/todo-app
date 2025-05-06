$(document).ready(function() {
    const loader = $('#loader');
    let currentFilter = 'all';

    // Theme switching
    const themeToggle = $('#themeToggle');
    
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.prop('checked', true);
    }

    // Theme toggle handler
    themeToggle.on('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // Update current date
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        $('#currentDate').text(now.toLocaleDateString('en-US', options));
    }
    updateDate();

    // Function to show/hide loader
    function toggleLoader(show) {
        if (show) {
            loader.addClass('active');
        } else {
            loader.removeClass('active');
        }
    }

    // Function to show notification
    function showNotification(message, type = 'info') {
        const notification = $('#notification');
        notification.removeClass('show');
        
        // Set icon and color based on type
        const icon = notification.find('i');
        icon.removeClass().addClass('fas');
        
        switch(type) {
            case 'success':
                icon.addClass('fa-check-circle');
                icon.css('color', 'var(--success-color)');
                break;
            case 'error':
                icon.addClass('fa-exclamation-circle');
                icon.css('color', 'var(--danger-color)');
                break;
            default:
                icon.addClass('fa-info-circle');
                icon.css('color', 'var(--primary-color)');
        }
        
        notification.find('.notification-message').text(message);
        
        // Trigger reflow to restart animation
        notification[0].offsetHeight;
        notification.addClass('show');
    }

    // Function to update stats
    function updateStats() {
        const totalTasks = $('.todo-item').length;
        const completedTasks = $('.todo-item.completed').length;
        const pendingTasks = totalTasks - completedTasks;
        
        $('#totalTasks').text(totalTasks);
        $('#completedTasks').text(completedTasks);
        $('#pendingTasks').text(pendingTasks);
        
        // Update progress bar
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        $('#completionProgress').css('width', `${progress}%`);
    }

    // Function to create XML string from todo data
    function createTodoXML(text, completed = false, priority = 'normal') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<todo>
    <text>${escapeXML(text)}</text>
    <completed>${completed}</completed>
    <priority>${priority}</priority>
    <timestamp>${new Date().getTime()}</timestamp>
</todo>`;
    }

    // Function to escape XML special characters
    function escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Function to parse XML response
    function parseTodoXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        return {
            id: xmlDoc.querySelector('id')?.textContent,
            text: xmlDoc.querySelector('text')?.textContent,
            completed: xmlDoc.querySelector('completed')?.textContent === 'true',
            timestamp: xmlDoc.querySelector('timestamp')?.textContent
        };
    }

    // Function to create todo item HTML
    function createTodoItemHTML(todo) {
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" data-priority="${todo.priority || 'normal'}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span>${escapeXML(todo.text)}</span>
                <button class="delete-btn" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    // Function to load todos
    function loadTodos() {
        toggleLoader(true);
        $.ajax({
            url: 'api.php',
            method: 'GET',
            data: { action: 'list', filter: currentFilter },
            success: function(response) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response, 'text/xml');
                
                if (xmlDoc.querySelector('error')) {
                    showNotification(xmlDoc.querySelector('error').textContent, 'error');
                    return;
                }

                const todos = xmlDoc.getElementsByTagName('todo');
                const todoList = $('.todo-list');
                todoList.empty();

                Array.from(todos).forEach(todo => {
                    const todoData = {
                        id: todo.querySelector('id').textContent,
                        text: todo.querySelector('text').textContent,
                        completed: todo.querySelector('completed').textContent === 'true',
                        priority: todo.querySelector('priority')?.textContent || 'normal',
                        timestamp: todo.querySelector('timestamp').textContent
                    };
                    todoList.append(createTodoItemHTML(todoData));
                });

                updateStats();
                updateTasksCount();
            },
            error: function(xhr, status, error) {
                showNotification('Error loading todos: ' + error, 'error');
            },
            complete: function() {
                toggleLoader(false);
            }
        });
    }

    // Function to update tasks count
    function updateTasksCount() {
        $.ajax({
            url: 'api.php',
            method: 'GET',
            data: { action: 'count' },
            success: function(response) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response, 'text/xml');
                const count = xmlDoc.querySelector('count').textContent;
                $('#tasks-count').text(count + ' tasks left');
            }
        });
    }

    // Add new todo
    $('#addTodo').click(function() {
        const input = $('#todoInput');
        const text = input.val().trim();
        const priority = $('#prioritySelect').val();
        
        if (text) {
            toggleLoader(true);
            $.ajax({
                url: 'api.php',
                method: 'POST',
                data: {
                    action: 'add',
                    todo: createTodoXML(text, false, priority)
                },
                success: function() {
                    input.val('');
                    loadTodos();
                    showNotification('Task added successfully', 'success');
                },
                error: function(xhr, status, error) {
                    showNotification('Error adding todo: ' + error, 'error');
                    toggleLoader(false);
                }
            });
        }
    });

    // Handle enter key in input
    $('#todoInput').keypress(function(e) {
        if (e.which === 13) {
            $('#addTodo').click();
        }
    });

    // Toggle todo completion
    $(document).on('change', '.todo-item input[type="checkbox"]', function() {
        const todoItem = $(this).closest('.todo-item');
        const id = todoItem.data('id');
        const completed = this.checked;

        toggleLoader(true);
        $.ajax({
            url: 'api.php',
            method: 'POST',
            data: {
                action: 'update',
                id: id,
                todo: createTodoXML(todoItem.find('span').text(), completed, todoItem.data('priority'))
            },
            success: function() {
                todoItem.toggleClass('completed', completed);
                updateStats();
                updateTasksCount();
                showNotification(completed ? 'Task completed!' : 'Task uncompleted', 'success');
            },
            error: function(xhr, status, error) {
                showNotification('Error updating todo: ' + error, 'error');
                $(this).prop('checked', !completed);
            },
            complete: function() {
                toggleLoader(false);
            }
        });
    });

    // Delete todo
    $(document).on('click', '.delete-btn', function() {
        const todoItem = $(this).closest('.todo-item');
        const id = todoItem.data('id');

        if (confirm('Are you sure you want to delete this task?')) {
            toggleLoader(true);
            $.ajax({
                url: 'api.php',
                method: 'POST',
                data: {
                    action: 'delete',
                    id: id
                },
                success: function() {
                    todoItem.remove();
                    updateStats();
                    updateTasksCount();
                    showNotification('Task deleted successfully', 'success');
                },
                error: function(xhr, status, error) {
                    showNotification('Error deleting todo: ' + error, 'error');
                },
                complete: function() {
                    toggleLoader(false);
                }
            });
        }
    });

    // Filter todos
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        loadTodos();
    });

    // Sort todos
    $('#sortSelect').change(function() {
        const sortBy = $(this).val();
        const todoList = $('.todo-list');
        const todos = todoList.children('.todo-item').get();
        
        todos.sort(function(a, b) {
            switch(sortBy) {
                case 'oldest':
                    return $(a).data('timestamp') - $(b).data('timestamp');
                case 'priority':
                    const priorities = { high: 3, normal: 2, low: 1 };
                    return priorities[$(b).data('priority')] - priorities[$(a).data('priority')];
                default: // newest
                    return $(b).data('timestamp') - $(a).data('timestamp');
            }
        });
        
        todoList.append(todos);
    });

    // Clear completed todos
    $('#clear-completed').click(function() {
        if ($('.todo-item.completed').length === 0) {
            showNotification('No completed tasks to clear', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear all completed tasks?')) {
            toggleLoader(true);
            $.ajax({
                url: 'api.php',
                method: 'POST',
                data: {
                    action: 'clear_completed'
                },
                success: function() {
                    loadTodos();
                    showNotification('Completed tasks cleared', 'success');
                },
                error: function(xhr, status, error) {
                    showNotification('Error clearing completed todos: ' + error, 'error');
                },
                complete: function() {
                    toggleLoader(false);
                }
            });
        }
    });

    // Initial load
    loadTodos();
}); 
$(document).ready(function() {
    const loader = $('#loader');
    let currentFilter = 'all';

    // Function to show/hide loader
    function toggleLoader(show) {
        if (show) {
            loader.addClass('active');
        } else {
            loader.removeClass('active');
        }
    }

    // Function to create XML string from todo data
    function createTodoXML(text, completed = false) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<todo>
    <text>${escapeXML(text)}</text>
    <completed>${completed}</completed>
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
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span>${escapeXML(todo.text)}</span>
                <button class="delete-btn">
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
                const todos = xmlDoc.getElementsByTagName('todo');
                const todoList = $('.todo-list');
                todoList.empty();

                Array.from(todos).forEach(todo => {
                    const todoData = {
                        id: todo.querySelector('id').textContent,
                        text: todo.querySelector('text').textContent,
                        completed: todo.querySelector('completed').textContent === 'true',
                        timestamp: todo.querySelector('timestamp').textContent
                    };
                    todoList.append(createTodoItemHTML(todoData));
                });

                updateTasksCount();
            },
            error: function(xhr, status, error) {
                alert('Error loading todos: ' + error);
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
        
        if (text) {
            toggleLoader(true);
            $.ajax({
                url: 'api.php',
                method: 'POST',
                data: {
                    action: 'add',
                    todo: createTodoXML(text)
                },
                success: function() {
                    input.val('');
                    loadTodos();
                },
                error: function(xhr, status, error) {
                    alert('Error adding todo: ' + error);
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
                todo: createTodoXML(todoItem.find('span').text(), completed)
            },
            success: function() {
                todoItem.toggleClass('completed', completed);
                updateTasksCount();
            },
            error: function(xhr, status, error) {
                alert('Error updating todo: ' + error);
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
                updateTasksCount();
            },
            error: function(xhr, status, error) {
                alert('Error deleting todo: ' + error);
            },
            complete: function() {
                toggleLoader(false);
            }
        });
    });

    // Filter todos
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        loadTodos();
    });

    // Clear completed todos
    $('#clear-completed').click(function() {
        toggleLoader(true);
        $.ajax({
            url: 'api.php',
            method: 'POST',
            data: {
                action: 'clear_completed'
            },
            success: function() {
                loadTodos();
            },
            error: function(xhr, status, error) {
                alert('Error clearing completed todos: ' + error);
            },
            complete: function() {
                toggleLoader(false);
            }
        });
    });

    // Initial load
    loadTodos();
}); 
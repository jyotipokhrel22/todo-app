$(document).ready(function() {
    // Load todos when page loads
    loadTodos();

    // Add new todo
    $('#addTodo').click(function() {
        addTodo();
    });

    // Add todo on Enter key press
    $('#todoInput').keypress(function(e) {
        if (e.which === 13) {
            addTodo();
        }
    });

    // Handle todo item events (delegated events)
    $('.todo-list').on('click', '.delete-btn', function() {
        const todoId = $(this).closest('.todo-item').data('id');
        deleteTodo(todoId);
    });

    $('.todo-list').on('change', 'input[type="checkbox"]', function() {
        const todoId = $(this).closest('.todo-item').data('id');
        const completed = $(this).prop('checked');
        updateTodoStatus(todoId, completed);
    });

    function addTodo() {
        const todoText = $('#todoInput').val().trim();
        if (todoText === '') return;

        $.ajax({
            url: 'php/add_todo.php',
            method: 'POST',
            data: { text: todoText },
            success: function(response) {
                if (response.success) {
                    $('#todoInput').val('');
                    loadTodos();
                }
            },
            error: function() {
                alert('Error adding todo!');
            }
        });
    }

    function loadTodos() {
        $.ajax({
            url: 'php/get_todos.php',
            method: 'GET',
            success: function(todos) {
                $('.todo-list').empty();
                todos.forEach(function(todo) {
                    const todoHtml = `
                        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                            <span>${todo.text}</span>
                            <button class="delete-btn">Delete</button>
                        </div>
                    `;
                    $('.todo-list').append(todoHtml);
                });
            },
            error: function() {
                alert('Error loading todos!');
            }
        });
    }

    function deleteTodo(id) {
        $.ajax({
            url: 'php/delete_todo.php',
            method: 'POST',
            data: { id: id },
            success: function(response) {
                if (response.success) {
                    loadTodos();
                }
            },
            error: function() {
                alert('Error deleting todo!');
            }
        });
    }

    function updateTodoStatus(id, completed) {
        $.ajax({
            url: 'php/update_todo.php',
            method: 'POST',
            data: { 
                id: id,
                completed: completed
            },
            success: function(response) {
                if (response.success) {
                    loadTodos();
                }
            },
            error: function() {
                alert('Error updating todo!');
            }
        });
    }
}); 
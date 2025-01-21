let currentSessionId = null;
let uploadedFiles = [];

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('http://localhost:3000/files/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        alert('File uploaded successfully!');
        uploadedFiles.push(result.fileId); // Store the file ID
        loadFiles();
    } catch (error) {
        alert('Error uploading file: ' + error);
    }
});

async function loadFiles() {
    try {
        const response = await fetch('http://localhost:3000/files');
        const files = await response.json();
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = files.map(file => `
            <div>
                <input type="checkbox" id="file_${file._id}" value="${file._id}">
                <label for="file_${file._id}">${file.filename}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function getSelectedFileIds() {
    const checkboxes = document.querySelectorAll('#filesList input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function sendPrompt() {
    const promptElement = document.getElementById('prompt');
    const prompt = promptElement.value.trim();
    const responseElement = document.getElementById('response');
    
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    if (!currentSessionId) {
        await createChatSession();
    }

    const llmProvider = document.getElementById('llmSelect').value;
    const selectedFileIds = getSelectedFileIds();
    
    try {
        // Show loading state
        responseElement.textContent = 'Loading...';
        responseElement.classList.add('loading');
        
        console.log('Sending request with:', {
            sessionId: currentSessionId,
            message: prompt,
            llmProvider: llmProvider,
            fileIds: selectedFileIds
        });

        const response = await fetch('http://localhost:3000/chat/messages', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                message: prompt,
                llmProvider: llmProvider,
                fileIds: selectedFileIds
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('LLM Response:', result);

        // Update the response element
        responseElement.classList.remove('loading');
        if (result && result.response) {
            responseElement.textContent = result.response;
        } else {
            responseElement.textContent = 'No response received from LLM';
        }

        // Clear the prompt
        promptElement.value = '';
    } catch (error) {
        console.error('Error in sendPrompt:', error);
        responseElement.classList.remove('loading');
        responseElement.textContent = `Error: ${error.message}`;
    }
}

// Add this to check if session creation works
async function createChatSession() {
    try {
        console.log('Creating new chat session...');
        const response = await fetch('http://localhost:3000/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'testUser',
                title: 'Test Session'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const session = await response.json();
        currentSessionId = session._id;
        console.log('Created session:', currentSessionId);
    } catch (error) {
        console.error('Error creating chat session:', error);
        throw error;
    }
}

// Add event listener for Enter key in textarea
document.getElementById('prompt').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default to avoid new line
        sendPrompt();
    }
});

// Load files when page loads
document.addEventListener('DOMContentLoaded', loadFiles);


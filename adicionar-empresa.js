function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

function showPopup(message, isSuccess) {
    const popup = document.createElement('div');
    popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
    popup.textContent = message;
    document.body.appendChild(popup);

    // Forçar reflow para animação
    popup.offsetWidth;

    // Fade-in
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0)';

    // Fade-out após 3 segundos
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(-10px)';
        setTimeout(() => popup.remove(), 300); // Remove após a animação
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
    }

    const companyForm = document.getElementById('company-form');
    companyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const companyName = document.getElementById('company-name').value.trim();
        const companyStore = document.getElementById('company-store').value.trim();
        
        if (!companyName || !companyStore) {
            showPopup('Por favor, preencha todos os campos.', false);
            return;
        }

        try {
            const response = await fetch('./php/adicionar-empresa.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `company-name=${encodeURIComponent(companyName)}&company-store=${encodeURIComponent(companyStore)}`
            });

            const result = await response.json();
            
            showPopup(result.message, result.success);
            
            if (result.success) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        } catch (error) {
            showPopup('Erro ao conectar com o servidor.', false);
        }
    });
});
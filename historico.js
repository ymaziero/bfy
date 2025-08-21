// Variáveis globais
let currentPage = 1;
let currentFilters = {};
let currentSort = 'date-desc';
let isLoading = false;
let hasAnimatedStats = false;

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Carregar tema salvo
    loadTheme();
    
    // Carregar histórico inicial
    loadHistory();
    
    // Configurar evento de busca
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            resetAndReloadHistory();
        }, 500);
    });

    // Configurar scroll infinito
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100) {
            if (!isLoading) {
                loadMoreHistory();
            }
        }
    });

    setupStatusTabs();
});

// Função para alternar tema
function toggleTheme() {
    const body = document.body;
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const themeIcon = document.getElementById('theme-icon');
    
    body.classList.remove(`${currentTheme}-theme`);
    body.classList.add(`${newTheme}-theme`);
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', newTheme);
}

// Função para carregar tema salvo
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeIcon = document.getElementById('theme-icon');
    
    document.body.classList.add(`${savedTheme}-theme`);
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Funções para modais
function toggleFilterModal() {
    const modal = document.getElementById('filter-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

function toggleSortModal() {
    const modal = document.getElementById('sort-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

// Fechar modais ao clicar fora
window.onclick = function(event) {
    const filterModal = document.getElementById('filter-modal');
    const sortModal = document.getElementById('sort-modal');
    
    if (event.target === filterModal) {
        filterModal.style.display = 'none';
    }
    if (event.target === sortModal) {
        sortModal.style.display = 'none';
    }
}

// Função para aplicar filtros
function applyFilters() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const company = document.getElementById('company-filter').value;
    const valueMin = document.getElementById('value-min').value;
    const valueMax = document.getElementById('value-max').value;
    const status = document.getElementById('status-filter').value;

    currentFilters = {
        dateFrom,
        dateTo,
        company,
        valueMin,
        valueMax,
        status,
        search: document.getElementById('search-input').value
    };

    resetAndReloadHistory();
    toggleFilterModal();
}

// Função para limpar filtros
function clearFilters() {
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('company-filter').value = '';
    document.getElementById('value-min').value = '';
    document.getElementById('value-max').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('search-input').value = '';

    currentFilters = {};
    resetAndReloadHistory();
    toggleFilterModal();
}

// Função para configurar ordenação
function setSortOption(option) {
    const sortOptions = document.querySelectorAll('.sort-option');
    sortOptions.forEach(btn => btn.classList.remove('active'));
    
    const selectedOption = document.querySelector(`[data-sort="${option}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }

    currentSort = option;
    resetAndReloadHistory();
    toggleSortModal();
}

// Configurar cliques nas opções de ordenação
document.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', () => {
        setSortOption(option.dataset.sort);
    });
});

// Função para resetar e recarregar o histórico
function resetAndReloadHistory() {
    currentPage = 1;
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    loadHistory();
}

// Função para carregar mais histórico
async function loadMoreHistory() {
    if (isLoading) return;
    
    isLoading = true;
    currentPage++;
    
    try {
        const response = await fetch('php/get_history.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page: currentPage,
                filters: currentFilters,
                sort: currentSort
            })
        });

        if (!response.ok) throw new Error('Erro ao carregar histórico');

        const data = await response.json();
        appendHistoryItems(data.items);

        if (data.items.length < 10) {
            document.getElementById('load-more-btn').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao carregar mais itens do histórico');
    } finally {
        isLoading = false;
    }
}

// Função para carregar histórico inicial
async function loadHistory() {
    try {
        const response = await fetch('php/get_history.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page: currentPage,
                filters: currentFilters,
                sort: currentSort
            })
        });

        if (!response.ok) throw new Error('Erro ao carregar histórico');

        const data = await response.json();
        const historyList = document.getElementById('history-list');
        if (historyList) {
            historyList.innerHTML = '';
            appendHistoryItems(data.items);
        }
        // Atualizar lista de empresas no filtro (caso use no futuro)
        if (data.companies) {
            updateCompanyFilter(data.companies);
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao carregar histórico');
    }
}

// Função para atualizar o filtro de empresas
function updateCompanyFilter(companies) {
    const select = document.getElementById('company-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        select.appendChild(option);
    });
}

// Função para animar números
function animateNumber(element, to, duration = 800) {
    const from = 0;
    const start = performance.now();
    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(progress * (to - from) + from);
        element.textContent = value;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = to;
        }
    }
    requestAnimationFrame(animate);
}

// Função para animar valores monetários
function animateCurrency(element, to, duration = 800) {
    const from = 0;
    const start = performance.now();
    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = progress * (to - from) + from;
        element.textContent = formatCurrency(value);
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = formatCurrency(to);
        }
    }
    requestAnimationFrame(animate);
}

// Função para atualizar estatísticas
function updateStats(items) {
    const totalBoletos = items.length;
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
    const totalBoletosEl = document.getElementById('total-boletos');
    const totalValueEl = document.getElementById('total-value');
    if (!hasAnimatedStats) {
        if (totalBoletosEl) animateNumber(totalBoletosEl, totalBoletos);
        if (totalValueEl) animateCurrency(totalValueEl, totalValue);
        hasAnimatedStats = true;
    } else {
        if (totalBoletosEl) totalBoletosEl.textContent = totalBoletos;
        if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
    }
}

// Filtro local dos itens exibidos
function filterItems(items) {
    let filtered = [...items];
    // Filtro por busca
    const search = (currentFilters.search || '').toLowerCase();
    if (search) {
        filtered = filtered.filter(item =>
            (item.local && item.local.toLowerCase().includes(search)) ||
            (item.boleto && item.boleto.toLowerCase().includes(search))
        );
    }
    // Filtro por empresa
    if (currentFilters.company) {
        filtered = filtered.filter(item => item.local === currentFilters.company);
    }
    // Filtro por valor mínimo
    if (currentFilters.valueMin) {
        filtered = filtered.filter(item => parseFloat(item.valor) >= parseFloat(currentFilters.valueMin));
    }
    // Filtro por valor máximo
    if (currentFilters.valueMax) {
        filtered = filtered.filter(item => parseFloat(item.valor) <= parseFloat(currentFilters.valueMax));
    }
    // Filtro por status (apenas se status for "salvo" ou outros)
    if (currentFilters.status && currentFilters.status !== 'all') {
        filtered = filtered.filter(item => (item.status || 'salvo') === currentFilters.status);
    }
    return filtered;
}

// Atualizar tabs de status
function setupStatusTabs() {
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilters.status = this.dataset.status;
            resetAndReloadHistory();
        });
    });
}

// Função para adicionar itens ao histórico
function appendHistoryItems(items) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    // Aplicar filtros locais
    const filteredItems = filterItems(items);
    updateStats(filteredItems, !hasAnimatedStats);
    if (!hasAnimatedStats) hasAnimatedStats = true;
    if (!filteredItems.length) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    } else {
        document.getElementById('empty-state').style.display = 'none';
    }
    filteredItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'history-item';
        itemElement.innerHTML = `
            <div class="history-item-header">
                <span class="company-name">${item.local}</span>
                <span class="boleto-status status-saved">Salvo</span>
            </div>
            <div class="history-item-details">
                <div class="detail-group">
                    <span class="detail-label">Boleto</span>
                    <button class="download-boleto-btn" onclick="event.stopPropagation();downloadBoletoPDF('${fixBoletoPath(item.boleto)}')">
                        <i class="fas fa-file-pdf"></i> Baixar PDF
                    </button>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Data de Criação</span>
                    <span class="detail-value">${formatDate(item.data_criacao)}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Valor</span>
                    <span class="detail-value">${formatCurrency(item.valor)}</span>
                </div>
            </div>
        `;
        historyList.appendChild(itemElement);
    });
}

// Corrige o caminho do PDF para garantir que sempre tenha 'boletos/' no início
function fixBoletoPath(path) {
    // Remove qualquer '../', './', ou '/' do início
    let clean = path.replace(/^([.]{1,2}\/?)+/, '');
    // Garante que começa com 'boletos/'
    if (!clean.startsWith('boletos/')) {
        clean = 'boletos/' + clean.replace(/^boletos\//, '');
    }
    return clean;
}

// Funções auxiliares
function getStatusClass(status) {
    if (status === 'salvo') return 'status-saved';
    const statusClasses = {
        'pending': 'status-pending',
        'paid': 'status-paid',
        'expired': 'status-expired'
    };
    return statusClasses[status] || 'status-pending';
}

function getStatusText(status) {
    if (status === 'salvo') return 'Salvo';
    const statusTexts = {
        'pending': 'Pendente',
        'paid': 'Pago',
        'expired': 'Vencido'
    };
    return statusTexts[status] || 'Pendente';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função para mostrar detalhes do boleto
function showBoletoDetails(item) {
    // Implementar visualização detalhada do boleto
    // Pode abrir um modal ou redirecionar para uma página de detalhes
    console.log('Detalhes do boleto:', item);
}

// Função para mostrar erro
function showError(message) {
    // Implementar sistema de notificação de erro
    alert(message);
}

// Função para baixar PDF automaticamente
function downloadBoletoPDF(pdfPath) {
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = pdfPath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

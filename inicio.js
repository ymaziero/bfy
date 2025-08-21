const DOM = {
    body: document.body,
    themeIcon: document.getElementById('theme-icon'),
    fileInput: document.getElementById('file-input'),
    loading: document.getElementById('loading'),
    resultTableBody: document.getElementById('result-table-body'),
    resultSection: document.getElementById('result-section'),
    boletosModal: document.getElementById('boletos-modal'),
    boletosModalList: document.getElementById('boletos-modal-list'),
    pdfModal: document.getElementById('pdf-modal'),
    pdfOptions: document.getElementById('pdf-options')
};

let boletoData = null;

function toggleTheme() {
    if (!DOM.themeIcon) {
        console.error('Theme icon element not found.');
        return;
    }

    DOM.body.classList.toggle('dark-mode');
    
    if (DOM.body.classList.contains('dark-mode')) {
        DOM.themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        DOM.themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!DOM.themeIcon) {
        console.error('Theme icon element not found.');
        return;
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        DOM.body.classList.add('dark-mode');
        DOM.themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
});

function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <h3>Erro</h3>
            <p>${sanitizeHTML(message)}</p>
            <div class="modal-actions">
                <button class="action-button">Fechar</button>
            </div>
        </div>
    `;
    DOM.body.appendChild(modal);

    const closeButton = modal.querySelector('.close');
    const actionButton = modal.querySelector('.action-button');
    
    const closeModalHandler = () => modal.remove();
    closeButton.addEventListener('click', closeModalHandler);
    actionButton.addEventListener('click', closeModalHandler);

    setTimeout(() => modal.classList.add('show'), 10);
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function openBoletosModal() {
    if (!DOM.boletosModal) {
        showErrorModal('Modal de boletos não encontrado.');
        return;
    }
    DOM.boletosModal.style.zIndex = '1000';
    DOM.boletosModal.style.display = 'flex';
    setTimeout(() => DOM.boletosModal.classList.add('show'), 10);
}

function closeBoletosModal() {
    if (!DOM.boletosModal) return;
    DOM.boletosModal.classList.remove('show');
    setTimeout(() => DOM.boletosModal.style.display = 'none', 300);
}

function scanDocument() {
    if (!DOM.fileInput) {
        showErrorModal('Input de arquivo não encontrado.');
        return;
    }
    DOM.fileInput.click();
}

DOM.fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    DOM.loading.style.display = 'flex';
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('./php/processar_boleto.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Resposta do servidor não é JSON.');
        }

        const data = await response.json();
        DOM.loading.style.display = 'none';

        console.log('Resposta do servidor:', data);

        if (data.error) {
            console.error('Erro retornado pelo servidor:', data.error);
            showErrorModal(data.error);
            return;
        }

        const novosBoletos = Array.isArray(data.boletos) ? data.boletos : [data];
        boletoData = boletoData ? boletoData.concat(novosBoletos) : novosBoletos;

        if (!boletoData.every(b => b && typeof b === 'object')) {
            showErrorModal('Dados de boleto inválidos recebidos do servidor.');
            return;
        }

        DOM.resultTableBody.innerHTML = '';
        boletoData.forEach((boleto, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Nº">${index + 1}</td>
                <td data-label="Documento">${sanitizeHTML(boleto.documento || 'N/A')}</td>
                <td data-label="Empresa">${sanitizeHTML(boleto.empresa || 'N/A')}</td>
                <td data-label="Local">${sanitizeHTML(boleto.local || 'N/A')}</td>
                <td data-label="Emissão">${sanitizeHTML(boleto.emissao || 'N/A')}</td>
                <td data-label="Vencimento">${sanitizeHTML(boleto.vencimento || 'N/A')}</td>
                <td data-label="Valor">R$ ${sanitizeHTML(boleto.valor || 'N/A')}</td>
            `;
            DOM.resultTableBody.appendChild(row);
        });

        DOM.resultSection.style.display = 'block';

        DOM.boletosModalList.innerHTML = '';
        boletoData.forEach((boleto, index) => {
            const boletoItem = document.createElement('div');
            boletoItem.className = 'boleto-item';
            boletoItem.innerHTML = `
                <h4>Boleto ${index + 1}</h4>
                <p><strong>Documento:</strong> ${sanitizeHTML(boleto.documento || 'N/A')}</p>
                <p><strong>Empresa:</strong> ${sanitizeHTML(boleto.empresa || 'N/A')}</p>
                <p><strong>Local:</strong> ${sanitizeHTML(boleto.local || 'N/A')}</p>
                <p><strong>Valor:</strong> R$ ${sanitizeHTML(boleto.valor || 'N/A')}</p>
                <p><strong>Emissão:</strong> ${sanitizeHTML(boleto.emissao || 'N/A')}</p>
                <p><strong>Vencimento:</strong> ${sanitizeHTML(boleto.vencimento || 'N/A')}</p>
            `;
            DOM.boletosModalList.appendChild(boletoItem);
        });

        console.log('Quantidade de boletos no modal:', boletoData.length);
        openBoletosModal();
    } catch (error) {
        DOM.loading.style.display = 'none';
        console.error('Erro ao processar a requisição:', error.message);
        showErrorModal(`Erro ao processar a imagem: ${error.message}`);
    }
});

function scanMoreDocuments() {
    if (!DOM.fileInput) {
        showErrorModal('Input de arquivo não encontrado.');
        return;
    }
    DOM.fileInput.value = '';
    DOM.fileInput.click();
}

function openPDFModal() {
    if (!boletoData || !boletoData.length) {
        showErrorModal('Nenhum boleto processado para gerar PDFs.');
        return;
    }

    if (!DOM.pdfModal || !DOM.pdfOptions) {
        showErrorModal('Elementos do modal de PDF não encontrados.');
        return;
    }

    DOM.pdfModal.style.zIndex = '2000';
    DOM.boletosModal.style.zIndex = '1000';

    const locais = [...new Set(boletoData.map(boleto => boleto.local || 'Desconhecido'))];
    DOM.pdfOptions.innerHTML = '';

    locais.forEach(local => {
        const button = document.createElement('button');
        button.className = 'action-button';
        button.textContent = `Baixar Boletos de ${sanitizeHTML(local)}`;
        button.addEventListener('click', () => generatePDFByLocal(local));
        DOM.pdfOptions.appendChild(button);
    });

    const allButton = document.createElement('button');
    allButton.className = 'action-button';
    allButton.textContent = 'Baixar Todos os Boletos';
    allButton.addEventListener('click', generatePDFsByLocal);
    DOM.pdfOptions.appendChild(allButton);

    DOM.pdfModal.style.display = 'flex';
    setTimeout(() => DOM.pdfModal.classList.add('show'), 10);
}

function closeModal(modal = DOM.pdfModal) {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        if (DOM.boletosModal && DOM.boletosModal.style.display === 'flex') {
            DOM.boletosModal.style.zIndex = '1000';
        }
    }, 300);
}

async function saveBoletoToDatabase(pdfDataUri, local, valor) {
    const formData = new FormData();
    formData.append('pdf', pdfDataUri.split(',')[1]);
    formData.append('local', sanitizeHTML(local));
    formData.append('data_criacao', new Date().toISOString());
    formData.append('valor', valor);

    try {
        const response = await fetch('./php/salvar_boleto.php', {
            method: 'POST',
            body: formData
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Resposta do servidor não é JSON.');
        }

        const data = await response.json();
        if (data.error) {
            console.error('Erro ao salvar boleto:', data.error);
            showErrorModal(`Erro ao salvar boleto: ${data.error}`);
        } else {
            console.log('Boleto salvo com sucesso:', data);
        }
    } catch (error) {
        console.error('Erro na requisição de salvamento:', error.message);
        showErrorModal(`Erro ao salvar boleto: ${error.message}`);
    }
}

function generatePDFByLocal(local) {
    if (!window.jspdf) {
        showErrorModal('Biblioteca jsPDF não carregada.');
        return;
    }

    const boletos = boletoData.filter(boleto => (boleto.local || 'Desconhecido') === local);
    if (!boletos.length) {
        showErrorModal(`Nenhum boleto encontrado para o local: ${sanitizeHTML(local)}.`);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('Helvetica');
    doc.setFontSize(16);
    doc.text(`Relatório de Boletos - Local: ${sanitizeHTML(local)}`, 105, 20, { align: 'center' });

    const tableBody = boletos.map((boleto, index) => [
        index + 1,
        sanitizeHTML(boleto.documento || 'N/A'),
        sanitizeHTML(boleto.empresa || 'N/A'),
        sanitizeHTML(boleto.local || 'N/A'),
        sanitizeHTML(boleto.emissao || 'N/A'),
        sanitizeHTML(boleto.vencimento || 'N/A'),
        'R$ ' + sanitizeHTML(boleto.valor || 'N/A'),
        sanitizeHTML(boleto.valor_com_juros || ''),
        sanitizeHTML(boleto.data_quitada || '')
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Nº', 'Documento', 'Empresa', 'Local', 'Emissão', 'Vencimento', 'Valor', 'Valor c/ Juros', 'Data Quitada']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            font: 'Helvetica',
            fontSize: 10
        }
    });

    const pdfDataUri = doc.output('datauristring');
    doc.save(`boletos_${sanitizeHTML(local).replace(/\s+/g, '_')}.pdf`);
    
    saveBoletoToDatabase(pdfDataUri, local, boletos.reduce((total, boleto) => total + (parseFloat(boleto.valor) || 0), 0));
    closeModal();
}

function generatePDFsByLocal() {
    if (!boletoData || !boletoData.length) {
        showErrorModal('Nenhum boleto processado para gerar PDFs.');
        return;
    }

    if (!window.jspdf) {
        showErrorModal('Biblioteca jsPDF não carregada.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('Helvetica');
    doc.setFontSize(16);
    doc.text('Relatório de Boletos - Todos os Locais', 105, 20, { align: 'center' });

    const tableBody = boletoData.map((boleto, index) => [
        index + 1,
        sanitizeHTML(boleto.documento || 'N/A'),
        sanitizeHTML(boleto.empresa || 'N/A'),
        sanitizeHTML(boleto.local || 'N/A'),
        sanitizeHTML(boleto.emissao || 'N/A'),
        sanitizeHTML(boleto.vencimento || 'N/A'),
        'R$ ' + sanitizeHTML(boleto.valor || 'N/A'),
        sanitizeHTML(boleto.valor_com_juros || ''),
        sanitizeHTML(boleto.data_quitada || '')
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Nº', 'Documento', 'Empresa', 'Local', 'Emissão', 'Vencimento', 'Valor', 'Valor c/ Juros', 'Data Quitada']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            font: 'Helvetica',
            fontSize: 10
        }
    });

    const pdfDataUri = doc.output('datauristring');
    doc.save('boletos_todos.pdf');
    const totalValor = boletoData.reduce((total, boleto) => total + (parseFloat(boleto.valor) || 0), 0);
    saveBoletoToDatabase(pdfDataUri, 'Todos', totalValor);
    closeModal();

    const successModal = document.createElement('div');
    successModal.className = 'modal';
    successModal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <h3>Sucesso</h3>
            <p>O PDF único com todos os boletos foi gerado e salvo com sucesso.</p>
            <div class="modal-actions">
                <button class="action-button">Fechar</button>
            </div>
        </div>
    `;
    DOM.body.appendChild(successModal);

    const closeButton = successModal.querySelector('.close');
    const actionButton = successModal.querySelector('.action-button');
    const closeModalHandler = () => successModal.remove();
    closeButton.addEventListener('click', closeModalHandler);
    actionButton.addEventListener('click', closeModalHandler);
    setTimeout(() => successModal.classList.add('show'), 10);
}

function shareWhatsApp() {
    if (!boletoData || !boletoData.length) {
        showErrorModal('Nenhum boleto processado para compartilhar.');
        return;
    }

    if (!window.jspdf) {
        showErrorModal('Biblioteca jsPDF não carregada.');
        return;
    }

    if (!URL.createObjectURL) {
        showErrorModal('Funcionalidade de compartilhamento não suportada neste navegador.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('Helvetica');
    doc.setFontSize(16);
    doc.text('Relatório de Boletos', 105, 20, { align: 'center' });

    const tableBody = boletoData.map((boleto, index) => [
        index + 1,
        sanitizeHTML(boleto.documento || 'N/A'),
        sanitizeHTML(boleto.empresa || 'N/A'),
        sanitizeHTML(boleto.local || 'N/A'),
        sanitizeHTML(boleto.emissao || 'N/A'),
        sanitizeHTML(boleto.vencimento || 'N/A'),
        'R$ ' + sanitizeHTML(boleto.valor || 'N/A'),
        sanitizeHTML(boleto.valor_com_juros || ''),
        sanitizeHTML(boleto.data_quitada || '')
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Nº', 'Documento', 'Empresa', 'Local', 'Emissão', 'Vencimento', 'Valor', 'Valor c/ Juros', 'Data Quitada']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            font: 'Helvetica',
            fontSize: 10
        }
    });

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const message = encodeURIComponent('Confira os boletos processados:');
    const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <h3>Compartilhar via WhatsApp</h3>
            <p>Seu PDF foi gerado. Clique no botão abaixo para abrir o WhatsApp e envie o arquivo manualmente.</p>
            <div class="modal-actions">
                <a href="${pdfUrl}" download="boletos.pdf" class="action-button">Baixar PDF</a>
                <a href="${whatsappUrl}" target="_blank" class="action-button whatsapp-button">Abrir WhatsApp</a>
            </div>
        </div>
    `;
    DOM.body.appendChild(modal);

    const closeButton = modal.querySelector('.close');
    const actionButton = modal.querySelector('.action-button:not(.whatsapp-button)');
    const closeModalHandler = () => modal.remove();
    closeButton.addEventListener('click', closeModalHandler);
    actionButton.addEventListener('click', closeModalHandler);

    setTimeout(() => modal.classList.add('show'), 10);
}

function viewHistory() {
    window.location.href = 'historico.html';
}

function generateReport() {
    showErrorModal('Funcionalidade de relatório completo em desenvolvimento.');
}

function addCompany() {
    window.location.href = 'adicionar-empresa.html';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', atualizarStatsBoletos);
} else {
    atualizarStatsBoletos();
}

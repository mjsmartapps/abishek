// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyCzq9AnR8PCPAgtI1sF5rWhZ30O70WrNzo",
    authDomain: "abishek-617e6.firebaseapp.com",
    projectId: "abishek-617e6",
    storageBucket: "abishek-617e6.firebasestorage.app",
    messagingSenderId: "238953689263",
    appId: "1:238953689263:web:50e23fc4329d971647e45a",
    measurementId: "G-FW3F077Z1M"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUserId = null;

function triggerPrint() {
    window.print();
    setTimeout(closePrintModal, 500); // Redirects / closes modal automatically after print dialog
}

function closePrintModal() {
    const printModal = document.getElementById("print-modal");
    if (printModal) printModal.style.display = "none";
    showView("invoice-view"); // back to invoice view
}

let stocks = [];
let invoices = [];
let purchases = [];
let customers = [];
let companyInfo = {
    name: "MJ SMART APP",
    phone: "+91 8220403716",
    address: "Ramanathapuram",
    email: "mjappkdl@gmail.com",
    gstin: "29AABCJ1234A1Z5",
    upiId: "jeyajegadeesh1606-1@oksbi"
};
let lastInvoiceNo = 1000;
let lastQuotationNo = 1000;
const lowStockThreshold = 10; // Fallback threshold
// Password for protected views
const ADMIN_PASSWORD = "1234"; 

// --- Utility Functions ---

const formatCurrency = (amount) => {
    const num = Number(amount);
    return num < 0 ? `-₹${Math.abs(num).toFixed(2)}` : `₹${num.toFixed(2)}`;
};

const showAlert = (message, type = 'success') => {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.classList.remove('danger');
    if (type === 'danger') {
        alertBox.classList.add('danger');
    }
    alertBox.classList.add('show');
    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
};

const showLoader = () => {
    document.getElementById('loader-container').style.display = 'flex';
};

const hideLoader = () => {
    document.getElementById('loader-container').style.display = 'none';
};

// Replace LocalStorage with Firebase
const saveData = () => {
    if (!currentUserId) return;
    try {
        db.collection('users').doc(currentUserId).set({
            stocks: stocks,
            invoices: invoices,
            purchases: purchases,
            customers: customers,
            companyInfo: companyInfo,
            lastInvoiceNo: lastInvoiceNo
        });
    } catch (e) {
        console.error('Error saving data to Firestore:', e);
    }
};

const loadData = async () => {
    if (!currentUserId) return;
    showLoader();
    try {
        const doc = await db.collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.stocks) stocks = data.stocks;
            if (data.invoices) invoices = data.invoices;
            if (data.purchases) purchases = data.purchases; else purchases = [];
            if (data.customers) customers = data.customers;
            if (data.companyInfo) companyInfo = data.companyInfo;
            if (data.lastInvoiceNo) lastInvoiceNo = parseInt(data.lastInvoiceNo, 10);
        }
        
        // Render UI after getting Firebase Data
        updateDashboard();
        renderStockTable();
        generateNewInvoice();
        generateNewQuotation();
        renderDatalist();
        renderSalesTable();
        setupPurchaseForm();
        renderPurchaseTable();
        updatePurchaseDashboard();
        renderPurchaseDatalists();
        renderSettingsForm();
    } catch (e) {
        console.error('Error loading data from Firestore:', e);
    }
    hideLoader();
};

// --- Main Application Logic ---

document.addEventListener('DOMContentLoaded', () => {

    // --- Dynamic UI Adjustments (Header Alignment, Color to Sky Blue, Hide Date Search) ---
    document.documentElement.style.setProperty('--primary-color', '#0ea5e9'); // Sky Blue
    document.documentElement.style.setProperty('--primary-light', '#38bdf8'); // Lighter Sky Blue
    document.documentElement.style.setProperty('--accent-color', '#0284c7'); // Darker Sky Blue replacing green

    const headerEl = document.querySelector('header');
    if (headerEl) {
        headerEl.style.flexDirection = 'column';
        headerEl.style.justifyContent = 'center';
        headerEl.style.alignItems = 'center';
        headerEl.style.textAlign = 'center';
    }
    
    const headerNav = document.querySelector('header nav');
    if (headerNav) {
        headerNav.style.justifyContent = 'center';
        headerNav.style.width = '100%';
        headerNav.style.marginTop = '1rem';
    }

    const dsInput = document.getElementById('date-search');
    if (dsInput) {
        const parentDiv = dsInput.closest('.form-row').parentElement;
        if (parentDiv) parentDiv.style.display = 'none';
    }
    const fsContainer = document.getElementById('filtered-sales-container');
    if (fsContainer) fsContainer.style.display = 'none';
    // --------------------------------------------------------------------------

    // Auth State Observer
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            currentUserId = user.uid;
            document.getElementById('login-modal').style.display = 'none';
            loadData(); // Load data dynamically from firestore once logged in
        } else {
            // No user is signed in.
            document.getElementById('login-modal').style.display = 'flex';
        }
    });

    // Login Form Submit Logic
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        showLoader();
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                hideLoader();
                showAlert('Login successful!', 'success');
            })
            .catch((error) => {
                // If the user doesn't exist, we can register them for convenience.
                if (error.code === 'auth/user-not-found') {
                    auth.createUserWithEmailAndPassword(email, password)
                        .then(() => {
                            hideLoader();
                            showAlert('New account created & logged in!', 'success');
                        })
                        .catch((regErr) => {
                            hideLoader();
                            showAlert('Login failed: ' + regErr.message, 'danger');
                        });
                } else {
                    hideLoader();
                    showAlert('Login failed: ' + error.message, 'danger');
                }
            });
    });


    // Setup Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;

            if (viewId === '' || viewId === 'settings-view') {
                document.getElementById('password-modal').style.display = 'flex';
                document.getElementById('password-input').focus();
                document.getElementById('password-form').dataset.targetView = viewId;
            } else if (viewId) {
                showView(viewId);
            }
        });
    });

    
    // Password modal logic
    document.getElementById('password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password-input').value;
        const targetView = document.getElementById('password-form').dataset.targetView;

        if (password === ADMIN_PASSWORD) {
            document.getElementById('password-modal').style.display = 'none';
            document.getElementById('password-input').value = '';
            showView(targetView);
        } else {
            const paidAmtEl = document.getElementById('paid-amount');
            if (paidAmtEl) paidAmtEl.required = false;
            showAlert('Incorrect password!', 'danger');
            document.getElementById('password-input').value = '';
        }
    });

    document.getElementById('password-close-btn').addEventListener('click', () => {
        document.getElementById('password-modal').style.display = 'none';
        document.getElementById('password-input').value = '';
    });

    // Specific button listeners
    document.getElementById('stock-file-input').addEventListener('change', importCSV);
    
    // Select All and Delete Selected logic added here
    document.getElementById('select-all-checkbox').addEventListener('change', toggleAllStocks);
    document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelectedStocks);
    document.getElementById('stock-search')?.addEventListener('input', filterStockTable);
    
    // Purchase search logic
    document.getElementById('purchase-search')?.addEventListener('input', filterPurchaseTable);

    // Initial View setup (Data renders moved to loadData)
    document.getElementById('add-stock-form').addEventListener('submit', addStock);
    document.getElementById('add-purchase-form').addEventListener('submit', addPurchase);
    setupInvoiceListeners();
    setupQuotationListeners();
    document.getElementById('sales-search').addEventListener('input', filterSalesTable);
    document.getElementById('sales-date-search').addEventListener('change', filterSalesTable); 
    document.querySelectorAll('input[name="sales-status-filter"]').forEach(radio => {
        radio.addEventListener('change', filterSalesTable);
    });
    document.getElementById('settings-form').addEventListener('submit', updateSettings);
});

const showView = (viewId) => {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
    
    // Re-render views as needed when switching
    if (viewId === 'dashboard-view') updateDashboard();
    if (viewId === 'stock-view') renderStockTable();
    if (viewId === 'sales-view') renderSalesTable();
    if (viewId === 'purchase-view') {
        renderPurchaseTable();
        updatePurchaseDashboard();
    }
    if (viewId === 'report-view') renderDailyReport();
};


// --- Dashboard View Functions ---
const updateDashboard = () => {
    const totalStock = stocks.reduce((sum, item) => sum + item.quantity, 0);
    const lowStock = stocks.filter(item => item.quantity <= (item.lowStock !== undefined ? item.lowStock : lowStockThreshold)).length;

    const today = new Date().toISOString().split('T')[0];
    const todaySales = invoices.filter(inv => inv.date === today);

    const todaySalesCount = todaySales.length;
    const todayCashTotal = todaySales.filter(inv => inv.mode === 'Cash').reduce((sum, inv) => sum + inv.total, 0);
    const todayOnlineTotal = todaySales.filter(inv => inv.mode === 'Online').reduce((sum, inv) => sum + inv.total, 0);
    const todayCreditTotal = todaySales.filter(inv => inv.status === 'Not Paid' || inv.status === 'Partially Paid').reduce((sum, inv) => inv.status === 'Partially Paid' ? sum + inv.balance : sum + inv.total, 0);
    
    const todayTotalAmount = todayCashTotal + todayOnlineTotal + todayCreditTotal;

    document.getElementById('total-stock').textContent = totalStock;
    document.getElementById('low-stock').textContent = lowStock;
    document.getElementById('today-sales-count').textContent = todaySalesCount;
    document.getElementById('today-total-amount').textContent = formatCurrency(todayTotalAmount);
    document.getElementById('today-cash').textContent = formatCurrency(todayCashTotal);
    document.getElementById('today-online').textContent = formatCurrency(todayOnlineTotal);
    document.getElementById('today-credit').textContent = formatCurrency(todayCreditTotal);

    renderLowStockList();
};

let selectedInvoiceForPayment = null;

function updatePayment(invoiceNo) {
    const inv = invoices.find(i => i.invoiceNo === invoiceNo);
    if (!inv) {
        showAlert("Invoice not found!", "danger");
        return;
    }

    selectedInvoiceForPayment = inv;

    document.getElementById("update-invoice-no").value = inv.invoiceNo;
    document.getElementById("update-total-amount").value = inv.total.toFixed(2);
    document.getElementById("update-paid-amount").value = inv.paid || 0;
    document.getElementById("update-balance").value = inv.balance || (inv.total - (inv.paid || 0));

    document.getElementById("update-payment-modal").style.display = "flex";
}

function processUpdatePayment() {
    if (!selectedInvoiceForPayment) return;

    const paidAmount = parseFloat(document.getElementById("update-paid-amount").value) || 0;
    const total = selectedInvoiceForPayment.total;

    selectedInvoiceForPayment.paid = paidAmount;
    selectedInvoiceForPayment.balance = total - paidAmount;

    if (paidAmount === 0) {
        selectedInvoiceForPayment.status = "Not Paid";
    } else if (paidAmount < total) {
        selectedInvoiceForPayment.status = "Partially Paid";
    } else {
        selectedInvoiceForPayment.status = "Paid";
        selectedInvoiceForPayment.balance = 0;
    }

    saveData();
    renderSalesTable();
    updateDashboard();

    showAlert("Payment updated successfully!", "success");
    document.getElementById("update-payment-modal").style.display = "none";
}

let paymentModeChartInstance = null;
let topItemsChartInstance = null;

function renderDailyReport() {
    const dateInput = document.getElementById('report-date-input');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    const targetDate = dateInput.value;
    const todaySales = invoices.filter(inv => inv.date === targetDate);
    
    const tbody = document.getElementById('daily-report-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        todaySales.forEach(inv => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem; border: 1px solid #ccc;">${inv.invoiceNo}</td>
                <td style="padding: 0.75rem; border: 1px solid #ccc;">${inv.customerName || 'Guest'}</td>
                <td style="padding: 0.75rem; border: 1px solid #ccc;">${inv.mode} (${inv.status})</td>
                <td style="padding: 0.75rem; border: 1px solid #ccc; text-align: right;">${formatCurrency(inv.total)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    const cash = todaySales.filter(inv => inv.mode === 'Cash').reduce((sum, inv) => sum + inv.total, 0);
    const online = todaySales.filter(inv => inv.mode === 'Online').reduce((sum, inv) => sum + inv.total, 0);
    const credit = todaySales.filter(inv => inv.status === 'Not Paid' || inv.status === 'Partially Paid').reduce((sum, inv) => inv.status === 'Partially Paid' ? sum + inv.balance : sum + inv.total, 0);
    const grandTotal = cash + online + credit;

    if (document.getElementById('report-cash-total')) document.getElementById('report-cash-total').textContent = formatCurrency(cash);
    if (document.getElementById('report-online-total')) document.getElementById('report-online-total').textContent = formatCurrency(online);
    if (document.getElementById('report-credit-total')) document.getElementById('report-credit-total').textContent = formatCurrency(credit);
    if (document.getElementById('report-grand-total')) document.getElementById('report-grand-total').textContent = formatCurrency(grandTotal);

    // Chart Data Preparation
    const itemSalesMap = {};
    todaySales.forEach(inv => {
        inv.items.forEach(item => {
            if (!itemSalesMap[item.id]) {
                itemSalesMap[item.id] = { name: item.name.replace('Returned: ', ''), qty: 0 };
            }
            itemSalesMap[item.id].qty += item.quantity;
        });
    });

    const top10Items = Object.values(itemSalesMap)
        .filter(item => item.qty > 0)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

    const top10Labels = top10Items.map(i => i.name);
    const top10Data = top10Items.map(i => i.qty);

    // Render Payment Mode Chart
    const ctxPayment = document.getElementById('paymentModeChart').getContext('2d');
    if (paymentModeChartInstance) paymentModeChartInstance.destroy();
    paymentModeChartInstance = new Chart(ctxPayment, {
        type: 'doughnut',
        data: {
            labels: ['Cash', 'Online', 'Credit'],
            datasets: [{
                data: [cash, online, credit],
                backgroundColor: ['#0ea5e9', '#38bdf8', '#ff8f00'], // Sky blue palette
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Render Top 10 Items Chart
    const ctxTop = document.getElementById('topItemsChart').getContext('2d');
    if (topItemsChartInstance) topItemsChartInstance.destroy();
    topItemsChartInstance = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: top10Labels,
            datasets: [{
                label: 'Quantity Sold',
                data: top10Data,
                backgroundColor: '#0ea5e9', // Sky blue
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function printDailyReport() {
    const targetDate = document.getElementById('report-date-input').value;
    const todaySales = invoices.filter(inv => inv.date === targetDate);
    const cash = todaySales.filter(inv => inv.mode === 'Cash').reduce((sum, inv) => sum + inv.total, 0);
    const online = todaySales.filter(inv => inv.mode === 'Online').reduce((sum, inv) => sum + inv.total, 0);
    const credit = todaySales.filter(inv => inv.status === 'Not Paid' || inv.status === 'Partially Paid').reduce((sum, inv) => inv.status === 'Partially Paid' ? sum + inv.balance : sum + inv.total, 0);
    const grandTotal = cash + online + credit;

    document.querySelectorAll('.print-view').forEach(el => el.classList.remove('print-view'));
    const reportView = document.getElementById('daily-report-print-view');
    reportView.classList.add('print-view');
    
    const reportContent = document.getElementById('daily-report-print-area').innerHTML;
    const logoSrc = "https://firebasestorage.googleapis.com/v0/b/mjsmartapps.firebasestorage.app/o/logo-removebg-preview.png?alt=media&token=90fb939f-ab11-41c4-8485-cd7e8b0414d6";

    reportView.innerHTML = `
        <img src="${logoSrc}" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.1; z-index:-1; pointer-events:none; width:350px;">
        <div class="invoice-header" style="position:relative; min-height:120px; padding:0 120px; text-align:center;">
            <img src="${logoSrc}" style="position:absolute; top:0; left:0; width:100px; height:100px; object-fit:contain;">
            <div style="position:absolute; top:0; right:0; text-align:center;">
                <div id="report-dynamic-qr" style="display:flex; justify-content:center; margin:0;"></div>
            </div>
            <h1 style="margin-bottom:0.25rem;">${companyInfo.name}</h1>
            <p style="margin:0.25rem 0;">${companyInfo.address}</p>
            <p style="margin:0.25rem 0;">Phone: ${companyInfo.phone} | Email: ${companyInfo.email}</p>
            <h3 style="margin-top: 1rem;">Daily Sales Report - ${targetDate}</h3>
        </div>
        <hr class="print-divider">
        ${reportContent}
    `;
    
    setTimeout(() => {
        const qrContainer = document.getElementById('report-dynamic-qr');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            const upiUrl = `upi://pay?pa=${companyInfo.upiId}&pn=${encodeURIComponent(companyInfo.name)}&am=${grandTotal}&tn=DailyReport`;
            new QRCode(qrContainer, {
                text: upiUrl,
                width: 100,
                height: 100,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }

        setTimeout(() => {
            window.print();
            reportView.classList.remove('print-view');
            document.getElementById('print-view').classList.add('print-view');
        }, 150); // Additional buffer to render the canvas
    }, 50);
}


const renderLowStockList = () => {
    const lowStockItems = stocks.filter(item => item.quantity <= (item.lowStock !== undefined ? item.lowStock : lowStockThreshold));
    const listContainer = document.getElementById('low-stock-list-container');
    const list = listContainer.querySelector('ul');
    list.innerHTML = '';

    if (lowStockItems.length > 0) {
        listContainer.style.display = 'block';
        lowStockItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${item.name} (${item.id})</span><span>Qty: ${item.quantity}</span>`;
            list.appendChild(listItem);
        });
    } else {
        listContainer.style.display = 'none';
    }
};

// --- New Function: Print Invoice Bill ---
function printInvoiceBill(invoiceNo) {
    const invoice = invoices.find(i => i.invoiceNo === invoiceNo);
    if (!invoice) {
        showAlert("Invoice not found!", "danger");
        return;
    }
    document.querySelectorAll('.print-view').forEach(el => el.classList.remove('print-view'));
    document.getElementById('print-view').classList.add('print-view');
    populatePrintView(invoice);
    
    setTimeout(() => {
        window.print();
    }, 300); // Small wait for QR Code Canvas rendering
}

// --- Stock View Functions ---

const filterStockTable = () => {
    const query = document.getElementById('stock-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#stock-table tbody tr');
    
    rows.forEach(row => {
        // Exclude the checkbox cell from text search to prevent odd matching, focus on code/name
        const itemCode = row.cells[1]?.textContent.toLowerCase() || '';
        const itemName = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (itemCode.includes(query) || itemName.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

const renderStockTable = () => {
    const stockTableBody = document.querySelector('#stock-table tbody');
    stockTableBody.innerHTML = '';
    
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    selectAllCheckbox.checked = stocks.length > 0 && stocks.every(s => s.selected);

    stocks.forEach(stock => {
        const row = document.createElement('tr');
        const currentLowStock = stock.lowStock !== undefined ? stock.lowStock : lowStockThreshold;
        const isLowStock = stock.quantity <= currentLowStock;
        row.style.backgroundColor = isLowStock ? '#fcf0f0' : '';
        
        row.innerHTML = `
            <td><input type="checkbox" data-id="${stock.id}" class="stock-checkbox" ${stock.selected ? 'checked' : ''}></td>
            <td>${stock.id}</td>
            <td>${stock.name}</td>
            <td>${stock.hsnCode || '-'}</td>
            <td>${stock.quantity}</td>
            <td>${formatCurrency(stock.price)}</td>
            <td>${currentLowStock}</td>
            <td class="action-buttons">
                <button class="btn-icon" onclick="editStock('${stock.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
                </button>
                <button class="btn-icon" onclick="deleteStock('${stock.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </td>
        `;
        stockTableBody.appendChild(row);
    });
    
    // Add event listeners to individual checkboxes
    document.querySelectorAll('.stock-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const stockId = e.target.dataset.id;
            const stock = stocks.find(s => s.id === stockId);
            if (stock) {
                stock.selected = e.target.checked;
                const allSelected = stocks.every(s => s.selected);
                selectAllCheckbox.checked = allSelected;
            }
        });
    });

    // Re-apply filter if a search query is currently active
    filterStockTable();
};

const toggleAllStocks = () => {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const isChecked = selectAllCheckbox.checked;
    stocks.forEach(stock => {
        stock.selected = isChecked;
    });
    renderStockTable();
};

const deleteSelectedStocks = () => {
    const selectedIds = stocks.filter(s => s.selected).map(s => s.id);
    if (selectedIds.length === 0) {
        showAlert("Please select at least one item to delete.", "danger");
        return;
    }

    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <p>Are you sure you want to delete ${selectedIds.length} selected items?</p>
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn-primary" id="modal-cancel">Cancel</button>
                <button class="btn-danger" id="modal-confirm">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('modal-cancel').onclick = () => { modal.remove(); };
    document.getElementById('modal-confirm').onclick = () => {
        stocks = stocks.filter(s => !selectedIds.includes(s.id));
        saveData();
        renderStockTable();
        updateDashboard();
        renderDatalist();
        
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        showAlert(`${selectedIds.length} items deleted successfully.`, 'danger');
        modal.remove();
    };
};

const addStock = (e) => {
    e.preventDefault();
    const id = document.getElementById('stock-code').value.toUpperCase().trim();
    const name = document.getElementById('stock-name').value.trim();
    const quantity = parseInt(document.getElementById('stock-quantity').value);
    const price = parseFloat(document.getElementById('stock-price').value);
    const lowStock = parseInt(document.getElementById('stock-low').value) || 0;
    const hsnCode = document.getElementById('stock-hsn').value.trim();

    // Add validation for quantity and price
    if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
        showAlert('Please enter valid positive numbers for Quantity and Unit Price.', 'danger');
        return;
    }
    
    // Add check to ensure stock code and name are not empty
    if (!id || !name) {
        showAlert('Please enter an Item Code and Item Name.', 'danger');
        return;
    }

    const existingStock = stocks.find(s => s.id === id);
    
    if (existingStock) {
        existingStock.quantity = quantity;
        existingStock.name = name;
        existingStock.price = price;
        existingStock.lowStock = lowStock;
        existingStock.hsnCode = hsnCode;
        showAlert('Stock updated successfully!', 'success');
    } else {
        stocks.push({ id, name, quantity, price, lowStock, hsnCode, selected: false });
        showAlert('New stock added successfully!', 'success');
    }

    saveData();
    document.getElementById('add-stock-form').reset();
    document.getElementById('stock-low').value = "10"; // reset low stock default
    renderStockTable();
    updateDashboard();
    renderDatalist();
};

const editStock = (id) => {
    const stock = stocks.find(s => s.id === id);
    if (stock) {
        document.getElementById('stock-code').value = stock.id;
        document.getElementById('stock-name').value = stock.name;
        document.getElementById('stock-quantity').value = stock.quantity;
        document.getElementById('stock-price').value = stock.price;
        document.getElementById('stock-low').value = stock.lowStock !== undefined ? stock.lowStock : lowStockThreshold;
        document.getElementById('stock-hsn').value = stock.hsnCode || '';
        showAlert(`Editing stock: ${stock.name}`, 'success');
    }
};

const deleteStock = (id) => {
    // Using a custom modal instead of a native confirm box
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <p>Are you sure you want to delete this stock item?</p>
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn-primary" id="modal-cancel">Cancel</button>
                <button class="btn-danger" id="modal-confirm">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('modal-cancel').onclick = () => { modal.remove(); };
    document.getElementById('modal-confirm').onclick = () => {
        const index = stocks.findIndex(s => s.id === id);
        if (index > -1) {
            stocks.splice(index, 1);
            saveData();
            renderStockTable();
            updateDashboard();
            showAlert('Stock item deleted.', 'danger');
        }
        modal.remove();
    };
};

const exportCSV = () => {
    if (stocks.length === 0) {
        showAlert('No stock data to export.', 'danger');
        return;
    }
    const headers = "Item Code,Item Name,HSN Code,Quantity,Unit Price,Low Stock At\n";
    const csvRows = stocks.map(s => `${s.id},"${s.name}","${s.hsnCode || ''}",${s.quantity},${s.price},${s.lowStock !== undefined ? s.lowStock : lowStockThreshold}`).join("\n");
    const csvContent = `data:text/csv;charset=utf-8,${headers}${csvRows}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stock_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('Stock data exported successfully!', 'success');
};

const importCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').slice(1);
        const newStocks = [];
        rows.forEach(row => {
            if(!row.trim()) return;
            const cols = [];
            let inQuotes = false;
            let currentVal = '';
            for(let char of row) {
                if(char === '"') inQuotes = !inQuotes;
                else if(char === ',' && !inQuotes) { cols.push(currentVal); currentVal = ''; }
                else currentVal += char;
            }
            cols.push(currentVal);

            if (cols.length >= 6) {
                const quantity = parseInt(cols[3]);
                const price = parseFloat(cols[4]);
                const lowStock = parseInt(cols[5]);
                if (!isNaN(quantity) && !isNaN(price) && quantity >= 0 && price >= 0) {
                    newStocks.push({
                        id: cols[0].trim(),
                        name: cols[1].trim().replace(/"/g, ''),
                        hsnCode: cols[2].trim().replace(/"/g, ''),
                        quantity: quantity,
                        price: price,
                        lowStock: isNaN(lowStock) ? 10 : lowStock,
                        selected: false
                    });
                }
            } else if (cols.length >= 4) { // Fallback for old CSV format
                const quantity = parseInt(cols[2]);
                const price = parseFloat(cols[3]);
                if (!isNaN(quantity) && !isNaN(price) && quantity >= 0 && price >= 0) {
                    newStocks.push({
                        id: cols[0].trim(),
                        name: cols[1].trim().replace(/"/g, ''),
                        hsnCode: '',
                        quantity: quantity,
                        price: price,
                        lowStock: 10,
                        selected: false
                    });
                }
            }
        });
        stocks = newStocks;
        saveData();
        renderStockTable();
        updateDashboard();
        showAlert('Stock data imported successfully!', 'success');
    };
    reader.readAsText(file);
};

// --- Purchase View Functions ---
let editingPurchaseId = null;

const filterPurchaseTable = () => {
    const query = document.getElementById('purchase-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#purchase-table tbody tr');
    
    rows.forEach(row => {
        const dealerName = row.cells[1]?.textContent.toLowerCase() || '';
        const companyName = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (dealerName.includes(query) || companyName.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

const setupPurchaseForm = () => {
    const dealerInput = document.getElementById('purchase-dealer-name');
    const companyInput = document.getElementById('purchase-company-name');
    
    if (dealerInput && !document.getElementById('dealer-names')) {
        dealerInput.setAttribute('list', 'dealer-names');
        const dl = document.createElement('datalist');
        dl.id = 'dealer-names';
        document.body.appendChild(dl);
    }
    if (companyInput && !document.getElementById('company-names')) {
        companyInput.setAttribute('list', 'company-names');
        const cl = document.createElement('datalist');
        cl.id = 'company-names';
        document.body.appendChild(cl);
    }
};

const renderPurchaseDatalists = () => {
    const dealerList = document.getElementById('dealer-names');
    const companyList = document.getElementById('company-names');
    if (!dealerList || !companyList) return;

    dealerList.innerHTML = '';
    companyList.innerHTML = '';

    const dealers = [...new Set(purchases.map(p => p.dealerName))];
    const companies = [...new Set(purchases.map(p => p.companyName))];

    dealers.forEach(d => {
        if(d) {
            const opt = document.createElement('option');
            opt.value = d;
            dealerList.appendChild(opt);
        }
    });
    companies.forEach(c => {
        if(c) {
            const opt = document.createElement('option');
            opt.value = c;
            companyList.appendChild(opt);
        }
    });
};

const updatePurchaseDashboard = () => {
    let dashboard = document.getElementById('purchase-dashboard-cards');
    if(!dashboard) {
        dashboard = document.createElement('div');
        dashboard.id = 'purchase-dashboard-cards';
        dashboard.className = 'dashboard-grid';
        dashboard.style.marginBottom = '2rem';
        
        const titleNode = document.querySelector('#purchase-view h1');
        if(titleNode) titleNode.parentNode.insertBefore(dashboard, titleNode.nextSibling);
    }

    const totalAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const totalBalance = purchases.reduce((sum, p) => sum + Number(p.balance), 0);

    dashboard.innerHTML = `
        <div class="dashboard-card">
            <span class="card-icon">💰</span>
            <div class="card-title">Total Amount</div>
            <div class="card-value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="dashboard-card">
            <span class="card-icon">💸</span>
            <div class="card-title">Total Paid Amount</div>
            <div class="card-value">${formatCurrency(totalPaid)}</div>
        </div>
        <div class="dashboard-card">
            <span class="card-icon">⚖️</span>
            <div class="card-title">Total Balance Amount</div>
            <div class="card-value" style="color: var(--danger-color);">${formatCurrency(totalBalance)}</div>
        </div>
    `;
};

const addPurchase = (e) => {
    e.preventDefault();
    const date = document.getElementById('purchase-date').value;
    const dealerName = document.getElementById('purchase-dealer-name').value.trim();
    const companyName = document.getElementById('purchase-company-name').value.trim();
    const totalAmount = parseFloat(document.getElementById('purchase-total-amount').value) || 0;
    const paidAmount = parseFloat(document.getElementById('purchase-paid-amount').value) || 0;

    if (paidAmount > totalAmount) {
        showAlert('Paid amount cannot be greater than total amount.', 'danger');
        return;
    }

    if (editingPurchaseId) {
        const purchase = purchases.find(p => p.id === editingPurchaseId);
        if (purchase) {
            purchase.date = date;
            purchase.dealerName = dealerName;
            purchase.companyName = companyName;
            
            if (paidAmount > purchase.paidAmount) {
                const diff = paidAmount - purchase.paidAmount;
                purchase.history = purchase.history || [];
                purchase.history.push({ date: new Date().toISOString().split('T')[0], amount: diff, note: 'Updated via Edit' });
            }
            
            purchase.totalAmount = totalAmount;
            purchase.paidAmount = paidAmount;
            purchase.balance = totalAmount - paidAmount;
        }
        editingPurchaseId = null;
        document.getElementById('add-purchase-btn').textContent = "Add Purchase";
        showAlert('Purchase updated successfully!', 'success');
    } else {
        const newPurchase = {
            id: 'PUR' + Date.now(),
            date,
            dealerName,
            companyName,
            totalAmount,
            paidAmount,
            balance: totalAmount - paidAmount,
            history: paidAmount > 0 ? [{ date: new Date().toISOString().split('T')[0], amount: paidAmount, note: 'Initial Payment' }] : []
        };
        purchases.push(newPurchase);
        showAlert('Purchase added successfully!', 'success');
    }

    saveData();
    renderPurchaseTable();
    updatePurchaseDashboard();
    renderPurchaseDatalists();
    document.getElementById('add-purchase-form').reset();
    document.getElementById('purchase-date').valueAsDate = new Date();
};

const editPurchase = (id) => {
    const purchase = purchases.find(p => p.id === id);
    if(purchase) {
        editingPurchaseId = id;
        document.getElementById('purchase-date').value = purchase.date;
        document.getElementById('purchase-dealer-name').value = purchase.dealerName;
        document.getElementById('purchase-company-name').value = purchase.companyName;
        document.getElementById('purchase-total-amount').value = purchase.totalAmount;
        document.getElementById('purchase-paid-amount').value = purchase.paidAmount;
        document.getElementById('add-purchase-btn').textContent = "Update Purchase";
        document.getElementById('purchase-date').focus();
    }
};

const payPurchase = (id) => {
    const purchase = purchases.find(p => p.id === id);
    if(!purchase) return;

    if (purchase.balance <= 0) {
        showAlert('Purchase is already fully paid.', 'success');
        return;
    }

    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <h2 style="margin-bottom:1.5rem;">Pay Purchase</h2>
            <div class="form-group">
                <label>Balance Amount</label>
                <input type="text" value="₹${purchase.balance.toFixed(2)}" readonly>
            </div>
            <div class="form-group">
                <label>Payment Amount</label>
                <input type="number" id="dynamic-pay-amount" max="${purchase.balance}" min="1" required>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn-danger" id="cancel-pay-btn">Cancel</button>
                <button class="btn-success" id="confirm-pay-btn">Pay</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('cancel-pay-btn').onclick = () => modal.remove();

    document.getElementById('confirm-pay-btn').onclick = () => {
        const amt = parseFloat(document.getElementById('dynamic-pay-amount').value) || 0;
        if(amt <= 0 || amt > purchase.balance) {
            showAlert('Invalid payment amount. Must be greater than 0 and less or equal to balance.', 'danger');
            return;
        }
        purchase.paidAmount += amt;
        purchase.balance -= amt;
        purchase.history = purchase.history || [];
        purchase.history.push({ date: new Date().toISOString().split('T')[0], amount: amt, note: 'Payment' });
        saveData();
        renderPurchaseTable();
        updatePurchaseDashboard();
        modal.remove();
        showAlert('Payment successful', 'success');
    };
};

const historyPurchase = (id) => {
    const purchase = purchases.find(p => p.id === id);
    if(!purchase) return;

    const modal = document.createElement('div');
    modal.classList.add('modal');
    
    let historyHtml = '';
    if (purchase.history && purchase.history.length > 0) {
        historyHtml = `
            <table style="width:100%; border-collapse: collapse; margin-top: 1rem;">
                <thead><tr style="background:#f6f9fc;"><th style="padding: 0.5rem;">Date</th><th style="padding: 0.5rem;">Amount</th><th style="padding: 0.5rem;">Note</th></tr></thead>
                <tbody>
                    ${purchase.history.map(h => `<tr><td style="padding: 0.5rem; border: 1px solid #ccc;">${h.date}</td><td style="padding: 0.5rem; border: 1px solid #ccc;">${formatCurrency(h.amount)}</td><td style="padding: 0.5rem; border: 1px solid #ccc;">${h.note || 'Payment'}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
    } else {
        historyHtml = '<p style="margin-top:1rem;">No payment history available.</p>';
    }

    modal.innerHTML = `
        <div class="modal-content">
            <h2>Payment History (${purchase.dealerName})</h2>
            ${historyHtml}
            <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                <button class="btn-primary" id="close-history-btn">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('close-history-btn').onclick = () => modal.remove();
};

const renderPurchaseTable = () => {
    const tbody = document.querySelector('#purchase-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    purchases.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.date}</td>
            <td>${p.dealerName}</td>
            <td>${p.companyName}</td>
            <td>${formatCurrency(p.totalAmount)}</td>
            <td>${formatCurrency(p.paidAmount)}</td>
            <td>${formatCurrency(p.balance)}</td>
            <td class="action-buttons" style="display:flex; gap: 0.5rem; flex-wrap:wrap;">
                <button class="btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin:0;" onclick="editPurchase('${p.id}')">Edit</button>
                <button class="btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin:0;" onclick="payPurchase('${p.id}')">Pay</button>
                <button class="btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin:0; background-color: #ff8f00;" onclick="historyPurchase('${p.id}')">History</button>
                <button class="btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin:0;" onclick="deletePurchase('${p.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Re-apply filter if a search query is currently active
    filterPurchaseTable();
};

const deletePurchase = (id) => {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <p>Are you sure you want to delete this purchase?</p>
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn-primary" id="modal-cancel">Cancel</button>
                <button class="btn-danger" id="modal-confirm">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('modal-cancel').onclick = () => { modal.remove(); };
    document.getElementById('modal-confirm').onclick = () => {
        const index = purchases.findIndex(p => p.id === id);
        if (index > -1) {
            purchases.splice(index, 1);
            saveData();
            renderPurchaseTable();
            updatePurchaseDashboard();
            renderPurchaseDatalists();
            showAlert('Purchase deleted.', 'danger');
        }
        modal.remove();
    };
};

// --- Quotation View Functions ---
let currentQuotationItems = [];

const generateNewQuotation = () => {
    // Determine quotation number (Session based/derived from lastInvoiceNo logic)
    const storedQuoteNo = localStorage.getItem('lastQuotationNo');
    if (storedQuoteNo) {
        lastQuotationNo = parseInt(storedQuoteNo, 10) + 1;
    } else {
        lastQuotationNo = lastInvoiceNo + 100; // Just to offset it from invoices slightly
    }
    
    document.getElementById('quotation-no').value = `QT${String(lastQuotationNo).padStart(3, '0')}`;
    document.getElementById('quotation-date').valueAsDate = new Date();
    document.getElementById('quotation-customer-name').value = '';
    document.getElementById('quotation-customer-phone').value = '';
    document.getElementById('quotation-customer-address').value = '';
    document.getElementById('quotation-gst-checkbox').checked = false;
    document.getElementById('quotation-discount').value = 0;
    document.getElementById('quotation-total-amount').value = formatCurrency(0);
    
    currentQuotationItems = [];
    renderQuotationItemsTable();
    clearQuotationItemInputs();
};

const clearQuotationItemInputs = () => {
    document.getElementById('quotation-item-stock-code').value = '';
    document.getElementById('quotation-item-stock-name').value = '';
    document.getElementById('quotation-item-quantity').value = '';
    document.getElementById('quotation-item-price').value = '';
    document.getElementById('quotation-available-stock').textContent = '0';
};

const setupQuotationListeners = () => {
    const codeInput = document.getElementById('quotation-item-stock-code');
    const nameInput = document.getElementById('quotation-item-stock-name');
    const qtyInput = document.getElementById('quotation-item-quantity');
    const discountInput = document.getElementById('quotation-discount');
    const gstCheckbox = document.getElementById('quotation-gst-checkbox');
    const savePrintBtn = document.getElementById('save-print-quotation-btn');
    const addItemBtn = document.getElementById('add-quotation-item-btn');

    // Allow editing unit price in form
    document.getElementById('quotation-item-price').removeAttribute('readonly');

    // Autocomplete logic
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            document.getElementById('quotation-item-quantity').focus();
        }
    });

    codeInput.addEventListener('input', () => {
        const stock = stocks.find(s => s.id === codeInput.value.toUpperCase());
        if (stock) {
            nameInput.value = stock.name;
            document.getElementById('quotation-item-price').value = stock.price;
            document.getElementById('quotation-available-stock').textContent = stock.quantity;
        }
    });

    nameInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            document.getElementById('quotation-item-quantity').focus();
        }
    });

    nameInput.addEventListener('input', () => {
        const stock = stocks.find(s => s.name.toLowerCase() === nameInput.value.toLowerCase());
        if (stock) {
            codeInput.value = stock.id;
            document.getElementById('quotation-item-price').value = stock.price;
            document.getElementById('quotation-available-stock').textContent = stock.quantity;
        }
    });

    qtyInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            document.getElementById('add-quotation-item-btn').click();   
            document.getElementById('quotation-item-stock-code').focus();      
        }
    });

    // Add item to quotation
    addItemBtn.addEventListener('click', () => {
        let id = codeInput.value.toUpperCase().trim();
        let stock = stocks.find(s => s.id === id);

        if (!stock) {
            const nameVal = nameInput.value.trim().toLowerCase();
            stock = stocks.find(s => s.name.toLowerCase() === nameVal);
            if (stock) id = stock.id;
        }

        const quantity = parseInt(qtyInput.value);
        const userPrice = parseFloat(document.getElementById('quotation-item-price').value);

        if (!stock) {
            showAlert('Invalid item code or name.', 'danger');
            return;
        }
        if (!quantity || quantity <= 0) {
            showAlert('Please enter a valid quantity.', 'danger');
            return;
        }
        if (isNaN(userPrice) || userPrice < 0) {
            showAlert('Please enter a valid price.', 'danger');
            return;
        }

        const existingItemIndex = currentQuotationItems.findIndex(item => item.id === id);
        if (existingItemIndex > -1) {
            currentQuotationItems[existingItemIndex].quantity += quantity;
            currentQuotationItems[existingItemIndex].unitPrice = userPrice;
            currentQuotationItems[existingItemIndex].total = currentQuotationItems[existingItemIndex].quantity * userPrice;
        } else {
            currentQuotationItems.push({
                id,
                name: stock.name,
                hsnCode: stock.hsnCode || '',
                quantity,
                unitPrice: userPrice,
                total: quantity * userPrice
            });
        }

        renderQuotationItemsTable();
        updateQuotationTotal();
        clearQuotationItemInputs();
    });

    // Update total on discount or GST change
    discountInput.addEventListener('input', updateQuotationTotal);
    gstCheckbox.addEventListener('change', updateQuotationTotal);

    // Save and Print Quotation
    savePrintBtn.addEventListener('click', saveAndPrintQuotation);
};

const renderQuotationItemsTable = () => {
    const tbody = document.querySelector('#quotation-items-table tbody');
    tbody.innerHTML = '';
    currentQuotationItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>
                <input type="number" class="edit-qty-input" data-index="${index}" value="${item.quantity}" min="1" style="width: 70px; padding: 0.25rem;">
            </td>
            <td>
                <input type="number" class="edit-price-input" data-index="${index}" value="${item.unitPrice}" min="0" step="0.01" style="width: 90px; padding: 0.25rem;">
            </td>
            <td>${formatCurrency(item.total)}</td>
            <td>
                <button class="btn-icon" onclick="removeQuotationItem(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('#quotation-items-table .edit-qty-input').forEach(input => {
        input.addEventListener('change', handleQuotationItemChange);
    });
    document.querySelectorAll('#quotation-items-table .edit-price-input').forEach(input => {
        input.addEventListener('change', handleQuotationItemChange);
    });
};

const handleQuotationItemChange = (e) => {
    const index = parseInt(e.target.dataset.index);
    const item = currentQuotationItems[index];
    
    const row = e.target.closest('tr');
    const newQty = parseInt(row.querySelector('.edit-qty-input').value);
    const newPrice = parseFloat(row.querySelector('.edit-price-input').value);
    
    if (isNaN(newQty) || newQty <= 0) {
        showAlert('Invalid quantity', 'danger');
        renderQuotationItemsTable(); // revert
        return;
    }
    if (isNaN(newPrice) || newPrice < 0) {
        showAlert('Invalid price', 'danger');
        renderQuotationItemsTable(); // revert
        return;
    }

    item.quantity = newQty;
    item.unitPrice = newPrice;
    item.total = newQty * newPrice;

    renderQuotationItemsTable();
    updateQuotationTotal();
};

const removeQuotationItem = (index) => {
    currentQuotationItems.splice(index, 1);
    renderQuotationItemsTable();
    updateQuotationTotal();
};

const updateQuotationTotal = () => {
    let subtotal = currentQuotationItems.reduce((sum, item) => sum + item.total, 0);
    const discountPercentage = parseFloat(document.getElementById('quotation-discount').value) || 0;
    const isGstEnabled = document.getElementById('quotation-gst-checkbox').checked;

    const discountAmount = subtotal * (discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const gstAmount = isGstEnabled ? subtotalAfterDiscount * 0.18 : 0;
    const grandTotal = subtotalAfterDiscount + gstAmount;

    document.getElementById('quotation-total-amount').value = formatCurrency(grandTotal);
};

const saveAndPrintQuotation = () => {
    if (currentQuotationItems.length === 0) {
        showAlert('Cannot print an empty quotation.', 'danger');
        return;
    }
    
    const quotationData = {
        invoiceNo: document.getElementById('quotation-no').value,
        date: document.getElementById('quotation-date').value,
        customerName: document.getElementById('quotation-customer-name').value || 'Guest',
        customerPhone: document.getElementById('quotation-customer-phone').value,
        customerAddress: document.getElementById('quotation-customer-address').value,
        items: [...currentQuotationItems],
        subtotal: currentQuotationItems.reduce((sum, item) => sum + item.total, 0),
        discount: parseFloat(document.getElementById('quotation-discount').value) || 0,
        gst: document.getElementById('quotation-gst-checkbox').checked ? (currentQuotationItems.reduce((sum, item) => sum + item.total, 0) - (currentQuotationItems.reduce((sum, item) => sum + item.total, 0) * (parseFloat(document.getElementById('quotation-discount').value) || 0) / 100)) * 0.18 : 0,
        total: parseFloat(document.getElementById('quotation-total-amount').value.replace('₹', '').replace('-', ''))
    };

    // Calculate totals correctly
    quotationData.total = currentQuotationItems.reduce((sum, item) => sum + item.total, 0);
    quotationData.total = quotationData.total - (quotationData.total * quotationData.discount / 100);
    if(document.getElementById('quotation-gst-checkbox').checked) quotationData.gst = quotationData.total * 0.18;
    quotationData.total += quotationData.gst;

    // Increment quotation number only
    lastQuotationNo++;
    localStorage.setItem('lastQuotationNo', lastQuotationNo);

    // Hide other print views and show quotation print view
    document.querySelectorAll('.print-view').forEach(el => el.classList.remove('print-view'));
    document.getElementById('quotation-print-view').classList.add('print-view');
    
    populateQuotationPrintView(quotationData);
    
    setTimeout(() => {
        window.print();
        
        // Revert print view class back to standard invoice print view to not break existing layout
        document.getElementById('quotation-print-view').classList.remove('print-view');
        document.getElementById('print-view').classList.add('print-view');
        
        generateNewQuotation();
        showAlert('Quotation generated successfully!', 'success');
    }, 300); // Give time for QR Canvas to render
};

const populateQuotationPrintView = (quote) => {
    const printView = document.getElementById('quotation-print-view');
    printView.style.position = 'relative';

    const logoSrc = "https://firebasestorage.googleapis.com/v0/b/mjsmartapps.firebasestorage.app/o/logo-removebg-preview.png?alt=media&token=90fb939f-ab11-41c4-8485-cd7e8b0414d6";

    // Dynamic Watermark
    let watermark = document.getElementById('quotation-watermark');
    if (!watermark) {
        watermark = document.createElement('img');
        watermark.id = 'quotation-watermark';
        watermark.src = logoSrc;
        watermark.style.position = 'fixed';
        watermark.style.top = '50%';
        watermark.style.left = '50%';
        watermark.style.transform = 'translate(-50%, -50%)';
        watermark.style.opacity = '0.1';
        watermark.style.zIndex = '-1';
        watermark.style.pointerEvents = 'none';
        watermark.style.width = '350px';
        printView.appendChild(watermark);
    } else {
        watermark.src = logoSrc;
    }

    // Header Setup
    const header = document.querySelector('#quotation-print-view .invoice-header');
    header.style.position = 'relative';
    header.style.minHeight = '120px';
    header.style.padding = '0 120px';

    // Top Left Logo
    let topLogo = document.getElementById('quotation-top-logo');
    if (!topLogo) {
        topLogo = document.createElement('img');
        topLogo.id = 'quotation-top-logo';
        topLogo.src = logoSrc;
        topLogo.style.position = 'absolute';
        topLogo.style.top = '0';
        topLogo.style.left = '0';
        topLogo.style.width = '100px';
        topLogo.style.height = '100px';
        topLogo.style.objectFit = 'contain';
        header.appendChild(topLogo);
    } else {
        topLogo.src = logoSrc;
    }

    document.getElementById('quotation-print-company-name').textContent = companyInfo.name;
    document.getElementById('quotation-print-company-address').textContent = companyInfo.address;
    document.getElementById('quotation-print-company-phone').textContent = companyInfo.phone;
    document.getElementById('quotation-print-company-email').textContent = companyInfo.email;
    document.getElementById('quotation-print-company-gstin').textContent = companyInfo.gstin;

    document.getElementById('quotation-print-invoice-no').textContent = quote.invoiceNo;
    document.getElementById('quotation-print-invoice-date').textContent = quote.date;
    document.getElementById('quotation-print-customer-name').textContent = quote.customerName;
    document.getElementById('quotation-print-customer-phone').textContent = quote.customerPhone;
    document.getElementById('quotation-print-customer-address').textContent = quote.customerAddress;

    const printItemsTbody = document.getElementById('quotation-print-items');
    printItemsTbody.innerHTML = '';
    quote.items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${index + 1}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${item.name}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${item.hsnCode || '-'}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${item.quantity}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${formatCurrency(item.unitPrice)}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem;">${formatCurrency(item.total)}</td>
        `;
        printItemsTbody.appendChild(row);
    });

    const subtotal = quote.subtotal;
    const discountAmount = subtotal * (quote.discount / 100);
    const gstAmount = quote.gst;
    const grandTotal = quote.total;

    document.getElementById('quotation-print-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('quotation-print-discount').textContent = formatCurrency(discountAmount);
    document.getElementById('quotation-print-gst').textContent = formatCurrency(gstAmount);
    document.getElementById('quotation-print-grand-total').textContent = formatCurrency(grandTotal);

    // Top Right QR Code
    let qrCodeContainer = document.getElementById('quotation-print-qr-code-container');
    if (!qrCodeContainer) {
        qrCodeContainer = document.createElement('div');
        qrCodeContainer.id = 'quotation-print-qr-code-container';
        header.appendChild(qrCodeContainer);
    }
    
    qrCodeContainer.style.display = 'block';
    qrCodeContainer.style.position = 'absolute';
    qrCodeContainer.style.top = '0';
    qrCodeContainer.style.right = '0';
    qrCodeContainer.style.marginTop = '0';
    qrCodeContainer.style.textAlign = 'center';

    let dynamicQr = document.getElementById('quotation-dynamic-qr-code');
    if (!dynamicQr) {
        dynamicQr = document.createElement('div');
        dynamicQr.id = 'quotation-dynamic-qr-code';
        dynamicQr.style.display = 'flex';
        dynamicQr.style.justifyContent = 'center';
        dynamicQr.style.margin = '0';
        qrCodeContainer.appendChild(dynamicQr);
    }
    
    dynamicQr.innerHTML = ''; 
    
    const upiUrl = `upi://pay?pa=${companyInfo.upiId}&pn=${encodeURIComponent(companyInfo.name)}&am=${quote.total}&tn=${encodeURIComponent('Quotation ' + quote.invoiceNo)}`;
    
    new QRCode(dynamicQr, {
        text: upiUrl,
        width: 100, 
        height: 100, 
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
};

// --- Invoice View Functions ---
// Auto-add item when pressing Enter/Tab in Quantity field
const qtyInput = document.getElementById('item-quantity');
qtyInput.addEventListener('keydown', (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        document.getElementById('add-item-btn').click();   // trigger Add Item button
        document.getElementById('item-stock-code').focus();      // move back to Stock Code
    }
});

let currentInvoiceItems = [];

const generateNewInvoice = () => {
    lastInvoiceNo++;
    document.getElementById('invoice-no').value = `INV${String(lastInvoiceNo).padStart(3, '0')}`;
    document.getElementById('invoice-date').valueAsDate = new Date();
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('gst-checkbox').checked = false;
    document.getElementById('discount').value = 0;
    document.getElementById('total-amount').value = formatCurrency(0);
    document.getElementById('payment-status').value = 'Full Paid';
    document.getElementById('payment-mode').value = 'Cash';
    document.getElementById('paid-balance-row').style.display = 'none';
    document.getElementById('paid-amount').value = '';
    currentInvoiceItems = [];
    renderInvoiceItemsTable();
    clearItemInputs();
    showAlert('New invoice form ready.', 'success');
    saveData();
};

const renderDatalist = () => {
    const datalistCodes = document.getElementById('stock-codes');
    const datalistNames = document.getElementById('stock-names');
    
    if (datalistCodes) datalistCodes.innerHTML = '';
    if (datalistNames) datalistNames.innerHTML = '';
    
    stocks.forEach(stock => {
        if (datalistCodes) {
            const optionCode = document.createElement('option');
            optionCode.value = stock.id;
            datalistCodes.appendChild(optionCode);
        }
        if (datalistNames) {
            const optionName = document.createElement('option');
            optionName.value = stock.name;
            datalistNames.appendChild(optionName);
        }
    });
};

const clearItemInputs = () => {
    document.getElementById('item-stock-code').value = '';
    document.getElementById('item-stock-name').value = '';
    document.getElementById('item-quantity').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('available-stock').textContent = '0';
};

const setupInvoiceListeners = () => {
const codeInput = document.getElementById('item-stock-code');
const nameInput = document.getElementById('item-stock-name');
const qtyInput = document.getElementById('item-quantity');
const paymentStatusSelect = document.getElementById('payment-status');
const discountInput = document.getElementById('discount');
const gstCheckbox = document.getElementById('gst-checkbox');
const savePrintBtn = document.getElementById('save-print-btn');
const addItemBtn = document.getElementById('add-item-btn');

// Allow editing unit price in form
document.getElementById('item-price').removeAttribute('readonly');

// Autocomplete logic
codeInput.addEventListener('keydown', (e) => {
if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    document.getElementById('item-quantity').focus();
}
});

codeInput.addEventListener('input', () => {
const stock = stocks.find(s => s.id === codeInput.value.toUpperCase());
if (stock) {
    nameInput.value = stock.name;
    document.getElementById('item-price').value = stock.price;
    document.getElementById('available-stock').textContent = stock.quantity;
}
});

nameInput.addEventListener('keydown', (e) => {
if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    document.getElementById('item-quantity').focus();
}
});

nameInput.addEventListener('input', () => {
const stock = stocks.find(s => s.name.toLowerCase() === nameInput.value.toLowerCase());
if (stock) {
    codeInput.value = stock.id;
    document.getElementById('item-price').value = stock.price;
    document.getElementById('available-stock').textContent = stock.quantity;
}
});

// Add item to invoice
addItemBtn.addEventListener('click', () => {
let id = codeInput.value.toUpperCase().trim();
let stock = stocks.find(s => s.id === id);

// Fallback to name search if code isnt directly matching
if (!stock) {
    const nameVal = nameInput.value.trim().toLowerCase();
    stock = stocks.find(s => s.name.toLowerCase() === nameVal);
    if (stock) id = stock.id;
}

const quantity = parseInt(qtyInput.value);
const userPrice = parseFloat(document.getElementById('item-price').value);

if (!stock) {
    showAlert('Invalid item code or name.', 'danger');
    return;
}
if (!quantity || quantity <= 0) {
    showAlert('Please enter a valid quantity.', 'danger');
    return;
}
if (isNaN(userPrice) || userPrice < 0) {
    showAlert('Please enter a valid price.', 'danger');
    return;
}
if (quantity > stock.quantity) {
    showAlert(`Not enough stock. Available: ${stock.quantity}`, 'danger');
    return;
}

const existingItemIndex = currentInvoiceItems.findIndex(item => item.id === id);
if (existingItemIndex > -1) {
    const newQty = currentInvoiceItems[existingItemIndex].quantity + quantity;
    if (newQty > stock.quantity + currentInvoiceItems[existingItemIndex].quantity) {
        showAlert(`Cannot add more. Exceeds available stock.`, 'danger');
        return;
    }
    currentInvoiceItems[existingItemIndex].quantity = newQty;
    currentInvoiceItems[existingItemIndex].unitPrice = userPrice;
    currentInvoiceItems[existingItemIndex].total = newQty * userPrice;
} else {
    document.getElementById('paid-amount').required = false;
    currentInvoiceItems.push({
        id,
        name: stock.name,
        hsnCode: stock.hsnCode || '',
        quantity,
        unitPrice: userPrice,
        total: quantity * userPrice
    });
}

// Deduct from stock
stock.quantity -= quantity;
saveData();
renderStockTable();
renderInvoiceItemsTable();
updateInvoiceTotal();
clearItemInputs();
});

// Update total on discount or GST change
discountInput.addEventListener('input', updateInvoiceTotal);
gstCheckbox.addEventListener('change', updateInvoiceTotal);

// Payment status changes
paymentStatusSelect.addEventListener('change', (e) => {
const row = document.getElementById('paid-balance-row');
if (e.target.value === 'Partially Paid' || e.target.value === 'Not Paid') {
    document.getElementById('paid-amount').required = true;
    row.style.display = 'flex';
} else {
    document.getElementById('paid-amount').required = false;
    row.style.display = 'none';
}
updatePaidBalance();
});

document.getElementById('paid-amount').addEventListener('input', updatePaidBalance);

// Save and Print Invoice directly
savePrintBtn.addEventListener('click', () => {
    saveAndPrintInvoice();
});
};


const updatePaidBalance = () => {
const total = parseFloat(document.getElementById('total-amount').value.replace('₹', '')) || 0;
const paid = parseFloat(document.getElementById('paid-amount').value) || 0;
const status = document.getElementById('payment-status').value;

if (status === 'Partially Paid' && paid >= total) {
showAlert('Paid amount cannot be greater than or equal to total for partial payment.', 'danger');
document.getElementById('paid-amount').value = '';
return; // stop further calculation
} else if (status === 'Full Paid') {
document.getElementById('paid-amount').value = total.toFixed(2);
} else if (status === 'Not Paid') {
document.getElementById('paid-amount').value = 0;
}

const finalPaid = parseFloat(document.getElementById('paid-amount').value) || 0;
const balance = total - finalPaid;

document.getElementById('balance-amount').value = balance.toFixed(2);
};


const renderInvoiceItemsTable = () => {
    const tbody = document.querySelector('#invoice-items-table tbody');
    tbody.innerHTML = '';
    currentInvoiceItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>
                <input type="number" class="edit-qty-input" data-index="${index}" value="${item.quantity}" min="1" style="width: 70px; padding: 0.25rem;">
            </td>
            <td>
                <input type="number" class="edit-price-input" data-index="${index}" value="${item.unitPrice}" min="0" step="0.01" style="width: 90px; padding: 0.25rem;">
            </td>
            <td>${formatCurrency(item.total)}</td>
            <td>
                <button class="btn-icon" onclick="removeItemFromInvoice(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('#invoice-items-table .edit-qty-input').forEach(input => {
        input.addEventListener('change', handleInvoiceItemChange);
    });
    document.querySelectorAll('#invoice-items-table .edit-price-input').forEach(input => {
        input.addEventListener('change', handleInvoiceItemChange);
    });
};

const handleInvoiceItemChange = (e) => {
    const index = parseInt(e.target.dataset.index);
    const item = currentInvoiceItems[index];
    const stock = stocks.find(s => s.id === item.id);
    
    const row = e.target.closest('tr');
    const newQty = parseInt(row.querySelector('.edit-qty-input').value);
    const newPrice = parseFloat(row.querySelector('.edit-price-input').value);
    
    if (isNaN(newQty) || newQty <= 0) {
        showAlert('Invalid quantity', 'danger');
        renderInvoiceItemsTable(); // revert
        return;
    }
    if (isNaN(newPrice) || newPrice < 0) {
        showAlert('Invalid price', 'danger');
        renderInvoiceItemsTable(); // revert
        return;
    }

    if (stock) {
        const qtyDifference = newQty - item.quantity;
        if (qtyDifference > 0 && stock.quantity < qtyDifference) {
            showAlert(`Not enough stock. Only ${stock.quantity} more available.`, 'danger');
            renderInvoiceItemsTable(); // revert
            return;
        }
        stock.quantity -= qtyDifference;
    }

    item.quantity = newQty;
    item.unitPrice = newPrice;
    item.total = newQty * newPrice;

    saveData();
    renderInvoiceItemsTable();
    renderStockTable();
    updateInvoiceTotal();
};

const removeItemFromInvoice = (index) => {
    const item = currentInvoiceItems[index];
    const stock = stocks.find(s => s.id === item.id);
    if (stock) {
        stock.quantity += item.quantity;
    }
    currentInvoiceItems.splice(index, 1);
    saveData();
    renderInvoiceItemsTable();
    renderStockTable();
    updateInvoiceTotal();
};

const updateInvoiceTotal = () => {
    let subtotal = currentInvoiceItems.reduce((sum, item) => sum + item.total, 0);
    const discountPercentage = parseFloat(document.getElementById('discount').value) || 0;
    const isGstEnabled = document.getElementById('gst-checkbox').checked;

    const discountAmount = subtotal * (discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const gstAmount = isGstEnabled ? subtotalAfterDiscount * 0.18 : 0;
    const grandTotal = subtotalAfterDiscount + gstAmount;

    document.getElementById('total-amount').value = formatCurrency(grandTotal);
    updatePaidBalance();
};

const saveAndPrintInvoice = () => {
    if (currentInvoiceItems.length === 0) {
        showAlert('Cannot save an empty invoice.', 'danger');
        return;
    }
    
    const invoiceData = {
        invoiceNo: document.getElementById('invoice-no').value,
        date: document.getElementById('invoice-date').value,
        customerName: document.getElementById('customer-name').value || 'Guest',
        customerPhone: document.getElementById('customer-phone').value,
        customerAddress: document.getElementById('customer-address').value,
        items: [...currentInvoiceItems],
        subtotal: currentInvoiceItems.reduce((sum, item) => sum + item.total, 0),
        discount: parseFloat(document.getElementById('discount').value) || 0,
        gst: document.getElementById('gst-checkbox').checked ? (currentInvoiceItems.reduce((sum, item) => sum + item.total, 0) - (currentInvoiceItems.reduce((sum, item) => sum + item.total, 0) * (parseFloat(document.getElementById('discount').value) || 0) / 100)) * 0.18 : 0,
        total: parseFloat(document.getElementById('total-amount').value.replace('₹', '').replace('-', '')),
        status: document.getElementById('payment-status').value,
        mode: document.getElementById('payment-mode').value,
        paid: parseFloat(document.getElementById('paid-amount').value) || 0,
        balance: parseFloat(document.getElementById('balance-amount').value) || 0,
    };

    // Fix balance calculation if total gets negative or adjusted
    invoiceData.total = currentInvoiceItems.reduce((sum, item) => sum + item.total, 0);
    invoiceData.total = invoiceData.total - (invoiceData.total * invoiceData.discount / 100);
    if(document.getElementById('gst-checkbox').checked) invoiceData.gst = invoiceData.total * 0.18;
    invoiceData.total += invoiceData.gst;

    // --- Save customer details into customers DB ---
    if (invoiceData.customerName && invoiceData.customerName !== 'Guest') {
        let existing = null;
        if (invoiceData.customerPhone) existing = customers.find(c => c.phone === invoiceData.customerPhone);
        if (!existing) existing = customers.find(c => c.name.toLowerCase() === invoiceData.customerName.toLowerCase());
        if (existing) {
            existing.name = invoiceData.customerName;
            existing.address = invoiceData.customerAddress;
            existing.phone = invoiceData.customerPhone;
            existing.transactions = existing.transactions || [];
            existing.transactions.push({
                invoiceNo: invoiceData.invoiceNo,
                date: invoiceData.date,
                total: invoiceData.total,
                status: invoiceData.status,
                mode: invoiceData.mode
            });
        } else {
            document.getElementById('paid-amount').required = false;
            customers.push({
                id: 'CUST' + (customers.length + 1).toString().padStart(3, '0'),
                name: invoiceData.customerName,
                phone: invoiceData.customerPhone,
                email: '',
                address: invoiceData.customerAddress,
                transactions: [{
                    invoiceNo: invoiceData.invoiceNo,
                    date: invoiceData.date,
                    total: invoiceData.total,
                    status: invoiceData.status,
                    mode: invoiceData.mode
                }]
            });
        }
    }

    // Validate Paid Amount when required
    if (invoiceData.status === "Partially Paid" || invoiceData.status === "") {
        if (!invoiceData.paid || invoiceData.paid <= 0) {
            showAlert("Please enter a valid Paid Amount.", "danger");
            return;
        }
    }

    invoices.push(invoiceData);
    saveData();
    renderSalesTable();
    updateDashboard();

    // Create Modal dynamically
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <span class="close-btn" id="popup-close-btn">&times;</span>
            <h2 style="margin-bottom: 1.5rem; color: var(--primary-color);">Invoice Saved!</h2>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-success" id="popup-print-btn" style="flex:1;">🖨 Print</button>
                <button class="btn-primary" id="popup-new-btn" style="flex:1;">➕ New Invoice</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('popup-close-btn').onclick = () => {
        modal.remove();
        generateNewInvoice(); 
    };

    document.getElementById('popup-new-btn').onclick = () => {
        modal.remove();
        generateNewInvoice();
    };

    document.getElementById('popup-print-btn').onclick = () => {
        document.querySelectorAll('.print-view').forEach(el => el.classList.remove('print-view'));
        document.getElementById('print-view').classList.add('print-view');
        populatePrintView(invoiceData);
        setTimeout(() => {
            window.print();
        }, 300); // Wait briefly to let the canvas render before printing
    };
    
    showAlert('Invoice saved successfully!', 'success');
};

const populatePrintView = (invoice) => {
    const printView = document.getElementById('print-view');
    printView.style.position = 'relative';

    const logoSrc = "https://firebasestorage.googleapis.com/v0/b/mjsmartapps.firebasestorage.app/o/logo-removebg-preview.png?alt=media&token=90fb939f-ab11-41c4-8485-cd7e8b0414d6";

    // --- Dynamic Watermark ---
    let watermark = document.getElementById('invoice-watermark');
    if (!watermark) {
        watermark = document.createElement('img');
        watermark.id = 'invoice-watermark';
        watermark.src = logoSrc;
        watermark.style.position = 'fixed';
        watermark.style.top = '50%';
        watermark.style.left = '50%';
        watermark.style.transform = 'translate(-50%, -50%)';
        watermark.style.opacity = '0.1'; // Faint transparency for watermark
        watermark.style.zIndex = '-1';
        watermark.style.pointerEvents = 'none';
        watermark.style.width = '350px';
        printView.appendChild(watermark);
    } else {
        watermark.src = logoSrc;
    }

    // --- Invoice Header Setup ---
    const header = document.querySelector('#print-view .invoice-header');
    header.style.position = 'relative';
    header.style.minHeight = '120px';
    header.style.padding = '0 120px'; // Push center text inwards to avoid absolute overlapping

    // --- Top Left Logo ---
    let topLogo = document.getElementById('invoice-top-logo');
    if (!topLogo) {
        topLogo = document.createElement('img');
        topLogo.id = 'invoice-top-logo';
        topLogo.src = logoSrc;
        topLogo.style.position = 'absolute';
        topLogo.style.top = '0';
        topLogo.style.left = '0';
        topLogo.style.width = '100px';
        topLogo.style.height = '100px';
        topLogo.style.objectFit = 'contain';
        header.appendChild(topLogo);
    } else {
        topLogo.src = logoSrc;
    }

    document.getElementById('print-company-name').textContent = companyInfo.name;
    document.getElementById('print-company-address').textContent = companyInfo.address;
    document.getElementById('print-company-phone').textContent = companyInfo.phone;
    document.getElementById('print-company-email').textContent = companyInfo.email;
    document.getElementById('print-company-gstin').textContent = companyInfo.gstin;

    document.getElementById('print-invoice-no').textContent = invoice.invoiceNo;
    document.getElementById('print-invoice-date').textContent = invoice.date;
    document.getElementById('print-customer-name').textContent = invoice.customerName;
    document.getElementById('print-customer-phone').textContent = invoice.customerPhone;
    document.getElementById('print-customer-address').textContent = invoice.customerAddress;

    const printItemsTbody = document.getElementById('print-invoice-items');
    printItemsTbody.innerHTML = '';
    invoice.items.forEach((item, index) => {
        const row = document.createElement('tr');
        const colorStyle = item.isReturn ? 'color: #d32f2f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;' : '';
        
        row.innerHTML = `
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${index + 1}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${item.name}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${item.hsnCode || '-'}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${item.quantity}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${formatCurrency(item.unitPrice)}</td>
            <td style="border: 1px solid #ccc; padding: 0.75rem; ${colorStyle}">${formatCurrency(item.total)}</td>
        `;
        printItemsTbody.appendChild(row);
    });

    const subtotal = invoice.subtotal;
    const discountAmount = subtotal * (invoice.discount / 100);
    const gstAmount = invoice.gst;
    const grandTotal = invoice.total;

    document.getElementById('print-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('print-discount').textContent = formatCurrency(discountAmount);
    document.getElementById('print-gst').textContent = formatCurrency(gstAmount);
    document.getElementById('print-grand-total').textContent = formatCurrency(grandTotal);
    document.getElementById('print-payment-status').textContent = invoice.status;
    document.getElementById('print-payment-mode').textContent = invoice.mode;

    const paidRow = document.getElementById('print-paid-amount-row');
    const balanceRow = document.getElementById('print-balance-row');
    if (invoice.status === 'Partially Paid') {
        paidRow.style.display = 'block';
        balanceRow.style.display = 'block';
        document.getElementById('print-paid-amount').textContent = formatCurrency(invoice.paid);
        document.getElementById('print-balance').textContent = formatCurrency(invoice.balance);
    } else if (invoice.status === 'Not Paid') {
        paidRow.style.display = 'block';
        balanceRow.style.display = 'block';
        document.getElementById('print-paid-amount').textContent = formatCurrency(invoice.paid);
        document.getElementById('print-balance').textContent = formatCurrency(invoice.balance);
    } else {
        paidRow.style.display = 'none';
        balanceRow.style.display = 'none';
    }

    // --- Move & Generate Top Right QR Code Always ---
    const qrCodeContainer = document.getElementById('print-qr-code-container');
    if (qrCodeContainer.parentNode !== header) {
        header.appendChild(qrCodeContainer); // Move container directly into the relative header
    }
    
    qrCodeContainer.style.display = 'block'; // ALWAYS SHOW
    qrCodeContainer.style.position = 'absolute';
    qrCodeContainer.style.top = '0';
    qrCodeContainer.style.right = '0';
    qrCodeContainer.style.marginTop = '0';
    qrCodeContainer.style.textAlign = 'center';
    
    // Hide 'Scan to Pay' heading
    const h3Text = qrCodeContainer.querySelector('h3');
    if (h3Text) {
        h3Text.style.display = 'none';
    }

    // Hide old static fallback image
    const staticImg = document.getElementById('print-qr-code');
    if (staticImg) staticImg.style.display = 'none';

    // dynamic rendering for QRCode.js
    let dynamicQr = document.getElementById('dynamic-qr-code');
    if (!dynamicQr) {
        dynamicQr = document.createElement('div');
        dynamicQr.id = 'dynamic-qr-code';
        dynamicQr.style.display = 'flex';
        dynamicQr.style.justifyContent = 'center';
        dynamicQr.style.margin = '0';
        qrCodeContainer.insertBefore(dynamicQr, document.getElementById('print-upi-id'));
    }
    
    dynamicQr.innerHTML = ''; // clear previous content
    
    const upiUrl = `upi://pay?pa=${companyInfo.upiId}&pn=${encodeURIComponent(companyInfo.name)}&am=${invoice.total}&tn=${encodeURIComponent('Invoice ' + invoice.invoiceNo)}`;
    
    // Using qrcode.js locally for instantaneous generation at strictly 100x100
    new QRCode(dynamicQr, {
        text: upiUrl,
        width: 100, // Matching Logo Size
        height: 100, // Matching Logo Size
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Hide UPI ID text
    const upiEl = document.getElementById('print-upi-id');
    if (upiEl) {
        upiEl.style.display = 'none';
    }
};


// --- Customer View ---
const renderCustomerTable = () => {
    const tbody = document.querySelector('#customer-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    customers.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.email || '-'}</td>
        `;
        tbody.appendChild(row);
        if (c.transactions && c.transactions.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4">
                <table style="width:100%;margin-top:0.5rem;border-collapse:collapse;">
                    <thead><tr style="background:#f6f9fc;"><th>Invoice</th><th>Date</th><th>Total</th><th>Status</th><th>Mode</th></tr></thead>
                    <tbody>
                        ${c.transactions.map(t => `
                            <tr><td>${t.invoiceNo}</td><td>${t.date}</td><td>${formatCurrency(t.total)}</td><td>${t.status}</td><td>${t.mode}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </td>`;
            tbody.appendChild(tr);
        }
    });
};

// --- Sales View Functions ---

const renderSalesTable = () => {
const salesTableBody = document.querySelector('#sales-table tbody');
salesTableBody.innerHTML = '';

invoices.forEach(inv => {
const row = document.createElement('tr');
row.innerHTML = `
    <td>${inv.invoiceNo}</td>
    <td>${inv.date}</td>
    <td>${inv.customerName}</td>
    <td>${formatCurrency(inv.total)}</td>
    <td>${inv.status}</td>
    <td>
        <button class="btn-primary" onclick="showReturnModal('${inv.invoiceNo}')">Return</button>
        <button class="btn-success" onclick="printInvoiceBill('${inv.invoiceNo}')">🖨 Print</button>
<button class="btn-primary" onclick="updatePayment('${inv.invoiceNo}')">Update</button>
    </td>
`;
salesTableBody.appendChild(row);
});
};


function processReturnInInvoice(){
    if(!selectedInvoice) return;
    const itemId=document.getElementById("return-item-select").value;
    const qty=parseInt(document.getElementById("return-item-qty").value);
    
    let availableQty = 0;
    selectedInvoice.items.forEach(i => {
        if (i.id === itemId) availableQty += i.quantity;
    });

    if(!itemId||qty<=0||qty>availableQty){showAlert("Invalid return qty","danger");return;}

    const stockItem=stocks.find(s=>s.id===itemId); if(stockItem) stockItem.quantity+=qty;
    
    const origItem = selectedInvoice.items.find(i=>i.id===itemId && !i.isReturn);

    selectedInvoice.items.push({
        id: itemId,
        name: "Returned: " + origItem.name,
        hsnCode: origItem.hsnCode || '',
        quantity: -qty,
        unitPrice: origItem.unitPrice,
        total: -(qty * origItem.unitPrice),
        isReturn: true
    });

    selectedInvoice.subtotal=selectedInvoice.items.reduce((s,i)=>s+i.total,0);
    const disc=selectedInvoice.discount||0;
    const afterDisc=selectedInvoice.subtotal-(selectedInvoice.subtotal*disc/100);
    selectedInvoice.gst=selectedInvoice.gst>0?afterDisc*0.18:0;
    selectedInvoice.total=afterDisc+selectedInvoice.gst;
    selectedInvoice.balance=selectedInvoice.total-(selectedInvoice.paid||0);
    
    if(selectedInvoice.customerPhone){const cust=customers.find(c=>c.phone===selectedInvoice.customerPhone);if(cust&&cust.transactions){const t=cust.transactions.find(t=>t.invoiceNo===selectedInvoice.invoiceNo);if(t){t.total=selectedInvoice.total;t.status=selectedInvoice.status;}}}
    
    saveData(); renderSalesTable(); renderStockTable(); updateDashboard(); renderCustomerTable();
    viewInvoice(selectedInvoice.invoiceNo);
    showAlert("Return processed & invoice updated","success");
}

const filterSalesTable = (e) => {
    const textSearchInput = document.getElementById('sales-search');
    const dateSearchInput = document.getElementById('sales-date-search');
    const statusFilterElement = document.querySelector('input[name="sales-status-filter"]:checked');
    
    const query = textSearchInput ? textSearchInput.value.toLowerCase() : '';
    const dateQuery = dateSearchInput ? dateSearchInput.value : '';
    const statusFilter = statusFilterElement ? statusFilterElement.value : 'All';
    
    const rows = document.querySelectorAll('#sales-table tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const dateCell = row.cells[1] ? row.cells[1].textContent : ''; 
        const statusCell = row.cells[4] ? row.cells[4].textContent : ''; 
        
        const matchesText = text.includes(query);
        const matchesDate = dateQuery === '' || dateCell === dateQuery;
        const matchesStatus = statusFilter === 'All' || statusCell.includes(statusFilter);
        
        row.style.display = matchesText && matchesDate && matchesStatus ? '' : 'none';
    });
};

let selectedInvoiceForReturn;
const showReturnModal = (invoiceNo) => {
    selectedInvoiceForReturn = invoices.find(inv => inv.invoiceNo === invoiceNo);
    if (!selectedInvoiceForReturn) {
        showAlert('Invoice not found.', 'danger');
        return;
    }

    const modal = document.getElementById('return-modal');
    const itemSelect = document.getElementById('return-item');
    
    document.getElementById('return-invoice-no').value = selectedInvoiceForReturn.invoiceNo;
    itemSelect.innerHTML = '';
    
    const itemMap = {};
    selectedInvoiceForReturn.items.forEach(item => {
        if (!itemMap[item.id]) itemMap[item.id] = { id: item.id, name: item.name.replace('Returned: ', ''), quantity: 0 };
        itemMap[item.id].quantity += item.quantity;
    });

    Object.values(itemMap).forEach(item => {
        if (item.quantity > 0) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (Qty: ${item.quantity})`;
            itemSelect.appendChild(option);
        }
    });
    
    document.getElementById('return-quantity').value = 1;
    modal.style.display = 'flex';
};

document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('return-modal').style.display = 'none';
});

document.getElementById('process-return-btn').addEventListener('click', () => {
    const itemId = document.getElementById('return-item').value;
    const returnQty = parseInt(document.getElementById('return-quantity').value);

    if (!itemId || !returnQty || returnQty <= 0) {
        showAlert('Please select an item and a valid quantity to return.', 'danger');
        return;
    }

    let availableQty = 0;
    selectedInvoiceForReturn.items.forEach(i => {
        if (i.id === itemId) availableQty += i.quantity;
    });

    if (returnQty > availableQty) {
        showAlert('Cannot return more than sold quantity.', 'danger');
        return;
    }

let selectedInvoice = null;

function viewInvoice(invoiceNo) {
const inv = invoices.find(i => i.invoiceNo === invoiceNo);
if (!inv) { 
showAlert("Invoice not found", "danger"); 
return; 
}

selectedInvoice = inv;

// Build invoice bill with print layout
document.querySelectorAll('.print-view').forEach(el => el.classList.remove('print-view'));
document.getElementById('print-view').classList.add('print-view');
populatePrintView(inv);

// Adding slight delay to let the dynamic QR code generate before loading HTML into popup
setTimeout(() => {
    const billHtml = document.getElementById("print-view").innerHTML;
    // Put it inside modal container
    document.getElementById("invoice-details-container").innerHTML = billHtml;

    // Populate return dropdown
    const sel = document.getElementById("return-item-select");
    sel.innerHTML = "";
    const itemMap = {};
    inv.items.forEach(item => {
        if (!itemMap[item.id]) itemMap[item.id] = { id: item.id, name: item.name.replace('Returned: ', ''), quantity: 0 };
        itemMap[item.id].quantity += item.quantity;
    });
    Object.values(itemMap).forEach(it => {
    if (it.quantity > 0) {
        let opt = document.createElement("option");
        opt.value = it.id;
        opt.textContent = `${it.name} (Qty:${it.quantity})`;
        sel.appendChild(opt);
    }
    });

    // Show invoice modal
    document.getElementById("invoice-modal").style.display = "flex";
}, 50);
}

window.viewInvoice = viewInvoice;


    // Update stock
    const stockItem = stocks.find(s => s.id === itemId);
    if (stockItem) {
        stockItem.quantity += returnQty;
        renderStockTable();
    }

    // Grab original item info
    const origItem = selectedInvoiceForReturn.items.find(i => i.id === itemId && !i.isReturn);

    // Update invoice item with a return row
    selectedInvoiceForReturn.items.push({
        id: itemId,
        name: "Returned: " + origItem.name,
        hsnCode: origItem.hsnCode || '',
        quantity: -returnQty,
        unitPrice: origItem.unitPrice,
        total: -(returnQty * origItem.unitPrice),
        isReturn: true
    });

    // Update invoice totals dynamically 
    const subtotal = selectedInvoiceForReturn.items.reduce((sum, item) => sum + item.total, 0);
    selectedInvoiceForReturn.subtotal = subtotal;
    const disc = selectedInvoiceForReturn.discount || 0;
    const afterDisc = subtotal - (subtotal * disc / 100);
    selectedInvoiceForReturn.gst = selectedInvoiceForReturn.gst > 0 ? afterDisc * 0.18 : 0;
    selectedInvoiceForReturn.total = afterDisc + selectedInvoiceForReturn.gst; 
    selectedInvoiceForReturn.balance = selectedInvoiceForReturn.total - (selectedInvoiceForReturn.paid || 0);

    if(selectedInvoiceForReturn.customerPhone){
        const cust=customers.find(c=>c.phone===selectedInvoiceForReturn.customerPhone);
        if(cust&&cust.transactions){
            const t=cust.transactions.find(t=>t.invoiceNo===selectedInvoiceForReturn.invoiceNo);
            if(t){t.total=selectedInvoiceForReturn.total;t.status=selectedInvoiceForReturn.status;}
        }
    }
    
    saveData();
    // Re-render tables
    renderSalesTable();
    updateDashboard();
    
    showAlert('Return processed successfully!', 'success');
    document.getElementById('return-modal').style.display = 'none';
});

// --- Settings View Functions ---
const renderSettingsForm = () => {
    document.getElementById('company-name').value = companyInfo.name;
    document.getElementById('company-phone').value = companyInfo.phone;
    document.getElementById('company-address').value = companyInfo.address;
    document.getElementById('company-email').value = companyInfo.email;
    document.getElementById('company-gstin').value = companyInfo.gstin;
    document.getElementById('upi-id').value = companyInfo.upiId;
};

const updateSettings = (e) => {
    e.preventDefault();
    companyInfo.name = document.getElementById('company-name').value;
    companyInfo.phone = document.getElementById('company-phone').value;
    companyInfo.address = document.getElementById('company-address').value;
    companyInfo.email = document.getElementById('company-email').value;
    companyInfo.gstin = document.getElementById('company-gstin').value;
    companyInfo.upiId = document.getElementById('upi-id').value;
    saveData();
    showAlert('Settings updated successfully!', 'success');
};

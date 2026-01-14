/**
 * Handsontable Pro Configuration for Capital One
 * Spreadsheet-first implementation
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- INITIALIZING HANDSONTABLE SUITE ---');
    if (window.lucide) window.lucide.createIcons();
    loadTestCases();
});

const gridsById = {};

async function loadTestCases() {
    const container = document.getElementById('test-cases-container');
    if (!container) return;

    // Use specific IDs to avoid collision
    const testCases = [
        { id: 'TC-101', name: 'User Authentication Flow', description: 'Core login validation' },
        { id: 'TC-102', name: 'Shopping Cart Flow', description: 'Cart management' }
    ];

    container.innerHTML = testCases.map(tc => `
        <div class="test-case-accordion mb-4 overflow-hidden border border-co-gray-800 rounded-xl" id="accordion-${tc.id}">
            <div class="test-case-header bg-co-gray-950 p-4 flex justify-between items-center cursor-pointer hover:bg-co-gray-900 transition-colors" onclick="toggleAccordion('${tc.id}')">
                <div class="flex items-center gap-4">
                    <div class="bg-co-blue-primary/20 text-co-blue-primary p-2 rounded-lg">
                        <i data-lucide="table-2" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-co-blue-primary">${tc.id}</span>
                        <h3 class="text-lg font-bold text-white leading-tight">${tc.name}</h3>
                    </div>
                </div>
                <i data-lucide="chevron-down" class="w-5 h-5 text-co-gray-500 accordion-icon"></i>
            </div>
            <div class="test-case-body hidden bg-co-gray-950 border-t border-co-gray-800" id="body-${tc.id}">
                <div class="p-4">
                    <div class="flex gap-2 mb-4">
                        <button onclick="addNewRow('${tc.id}')" class="bg-co-blue-primary hover:bg-co-blue-secondary text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all">
                            <i data-lucide="plus" class="w-3 h-3"></i> ADD STEP
                        </button>
                    </div>
                    <div class="hot-container rounded-lg overflow-hidden border border-co-gray-800 shadow-xl" id="hot-${tc.id}"></div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
}

window.toggleAccordion = function(id) {
    const body = document.getElementById(`body-${id}`);
    const icon = document.querySelector(`#accordion-${id} .accordion-icon`);
    
    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
        if (!gridsById[id]) {
            setTimeout(() => initializeHot(id), 50);
        }
    } else {
        body.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
};

function initializeHot(id) {
    const container = document.getElementById(`hot-${id}`);
    if (!container) return;

    console.log(`Instantiating Handsontable for ${id}`);
    
    const hot = new Handsontable(container, {
        licenseKey: 'non-commercial-and-evaluation',
        data: [
            ['Navigate to login', 'navigation', '', 'url', 'https://capitalone.com/login', true, 'Page loads'],
            ['Click btn', 'interaction', 'btn-1', 'click', '', false, 'Action triggered']
        ],
        colHeaders: ['STEP DEFINITION', 'TYPE', 'ELEMENT ID', 'ACTION', 'ACTION RESULT', 'REQUIRED', 'EXPECTED RESULTS'],
        rowHeaders: true,
        width: '100%',
        height: 'auto',
        stretchH: 'all',
        
        // Configuration
        columns: [
            { type: 'text', className: 'htLeft htMiddle' },
            { 
                type: 'dropdown', 
                source: ['navigation', 'interaction', 'validation', 'data_entry', 'wait'],
                className: 'htCenter htMiddle'
            },
            { type: 'text', className: 'htCenter htMiddle font-mono' },
            { 
                type: 'dropdown', 
                source: ['active', 'visible', 'click', 'text_match', 'text_plain', 'url', 'custom_select', 'options_match'],
                className: 'htCenter htMiddle'
            },
            { type: 'text', className: 'htLeft htMiddle font-mono' },
            { type: 'checkbox', className: 'htCenter htMiddle' },
            { type: 'text', className: 'htLeft htMiddle italic opacity-80' }
        ],
        
        // Behavior
        contextMenu: true,
        dropdownMenu: true,
        filters: true,
        manualColumnResize: true,
        manualRowMove: true,
        autoWrapCol: true,
        autoWrapRow: true,
        fillHandle: true, // Grid selection drag
        
        // Events
        afterChange: (changes) => {
            if (changes) console.log('Spreadsheet data updated:', changes);
        }
    });

    gridsById[id] = hot;
}

window.addNewRow = function(id) {
    const hot = gridsById[id];
    if (hot) hot.alter('insert_row_below');
};

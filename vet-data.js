// تفعيل محرك البحث في منصة VetAI - د. محجوبي عبدالناصر
window.vetPlatformData = {
    status: "active"
};

// تفعيل وظيفة البحث والضغط تلقائياً
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        const searchBtn = document.getElementById("hsb");
        const searchInput = document.getElementById("hs");
        
        if(searchBtn && searchInput) {
            searchBtn.onclick = function() {
                const query = searchInput.value.trim();
                if(query) {
                    // الانتقال المباشر إلى قسم المرجع السريري وتفعيل البحث
                    if(typeof switchTab === 'function') {
                        switchTab('ref');
                    }
                    const globalSearch = document.getElementById("gs");
                    if(globalSearch) {
                        globalSearch.value = query;
                        globalSearch.dispatchEvent(new Event('input'));
                    }
                }
            };
            
            // تفعيل الضغط على زر الإدخال (Enter) أيضاً
            searchInput.onkeydown = function(e) {
                if(e.key === 'Enter') {
                    searchBtn.click();
                }
            };
        }
    }, 500);
});

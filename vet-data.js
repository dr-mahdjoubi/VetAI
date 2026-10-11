// محرك البحث المباشر لمنصة VetAI - د. محجوبي عبدالناصر
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        const searchBtn = document.getElementById("hsb");
        const searchInput = document.getElementById("hs");
        
        if(searchBtn && searchInput) {
            // إلغاء الوظيفة القديمة وتعطيل الانتقال للشريط العلوي
            searchBtn.replaceWith(searchBtn.cloneNode(true));
            const newSearchBtn = document.getElementById("hsb");
            
            newSearchBtn.addEventListener("click", function(e) {
                e.preventDefault();
                const query = searchInput.value.trim();
                if(query) {
                    // الانتقال التلقائي إلى قسم المرجع السريري وعرض نتائج البحث
                    if(typeof switchTab === 'function') {
                        switchTab('ref');
                    }
                    setTimeout(function() {
                        const globalSearch = document.getElementById("gs");
                        if(globalSearch) {
                            globalSearch.value = query;
                            globalSearch.dispatchEvent(new Event('input'));
                        }
                    }, 300);
                }
            });
            
            searchInput.onkeydown = function(e) {
                if(e.key === 'Enter') {
                    newSearchBtn.click();
                }
            };
        }
    }, 600);
});

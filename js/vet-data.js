// حل مباشر لتشغيل زر البحث في منتصف الصفحة
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        const searchBtn = document.getElementById("hsb");
        const searchInput = document.getElementById("hs");
        
        if(searchBtn && searchInput) {
            // إنشاء زر جديد كلياً بدلاً من القديم لقطع أي ارتباط برمجي سابق
            const newBtn = searchBtn.cloneNode(true);
            searchBtn.parentNode.replaceChild(newBtn, searchBtn);
            
            newBtn.addEventListener("click", function(e) {
                e.preventDefault();
                const query = searchInput.value.trim();
                if(query) {
                    // الانتقال المباشر لقسم المرجع السريري وعرض النتائج
                    if(typeof switchTab === 'function') {
                        switchTab('ref');
                    }
                    setTimeout(function() {
                        const globalSearch = document.getElementById("gs");
                        if(globalSearch) {
                            globalSearch.value = query;
                            globalSearch.dispatchEvent(new Event('input'));
                        }
                    }, 350);
                }
            });
            
            searchInput.addEventListener("keydown", function(e) {
                if(e.key === 'Enter') {
                    e.preventDefault();
                    newBtn.click();
                }
            });
        }
    }, 800);
});

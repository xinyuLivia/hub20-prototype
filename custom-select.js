// 立即执行，避免 DOMContentLoaded 带来的闪烁 (FOUC)
(function initCustomSelects() {
    if (window._customSelectsInited) return;
    window._customSelectsInited = true;

    // 注入核心交互 CSS
    const style = document.createElement('style');
    style.innerHTML = `
        /* 隐藏原生下拉 */
        .select-hidden { display: none !important; }
        
        /* 触发器悬浮态 */
        .custom-select-wrapper .select-trigger:hover { border-color: #177ddc !important; }
        
        /* 图标显隐逻辑 */
        .custom-select-wrapper.has-value .select-trigger:hover .chevron-icon { display: none !important; }
        .custom-select-wrapper.has-value .select-trigger:hover .clear-icon { display: block !important; }
        .custom-select-wrapper .clear-icon:hover { color: #fff !important; }
        
        /* 下拉面板动效与样式 */
        .select-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 4px); background: #1f1f1f; border: 1px solid #303030; border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.5); z-index: 9999; padding: 4px 0; max-height: 240px; overflow-y: auto; display: none; }
        .select-dropdown.show { display: block; animation: selectFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes selectFadeIn { from { opacity: 0; transform: scaleY(0.95); transform-origin: top; } to { opacity: 1; transform: scaleY(1); transform-origin: top; } }
        
        /* 滚动条 */
        .select-dropdown::-webkit-scrollbar { width: 6px; }
        .select-dropdown::-webkit-scrollbar-thumb { background: #434343; border-radius: 3px; }
        .select-dropdown::-webkit-scrollbar-thumb:hover { background: #5a5a5a; }
        
        /* 选项样式 */
        .select-option { padding: 6px 12px; margin: 2px 4px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #e5e5e5; transition: background-color 0.2s; }
        .select-option:hover { background-color: rgba(255,255,255,0.08); }
        .select-option.selected { background-color: rgba(255,255,255,0.04); font-weight: 500; }
    `;
    document.head.appendChild(style);

    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        // 跳过分页器
        if (select.querySelector('option') && select.querySelector('option').textContent.includes('条/页')) return;
        if (select.classList.contains('no-custom')) return;
        
        const parent = select.parentElement;
        if (!parent || !parent.classList.contains('relative')) return;

        // 提取原 Select 的类名，保持绝对一致的视觉（高度、边框、背景、圆角等）
        let triggerClasses = select.className.replace(/no-custom/g, '').replace(/focus:[^\s]+/g, '').replace(/w-full/g, '').trim();
        
        // 隐藏原生下拉与紧邻的旧图标
        select.classList.add('select-hidden');
        const siblingIcon = parent.querySelector('.fa-chevron-down');
        if (siblingIcon && siblingIcon !== select) {
            siblingIcon.classList.add('select-hidden');
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper w-full h-full relative';
        
        // 提取 Placeholder（找到第一项，通常是空 value 或带"全部"的项）
        const defaultOption = Array.from(select.options).find(o => o.value === '' || o.textContent.startsWith('全部'));
        let basePlaceholder = defaultOption ? defaultOption.textContent : '请选择';
        if (basePlaceholder.startsWith('全部')) {
            basePlaceholder = basePlaceholder.replace('全部', '');
        }

        // 构建下拉选项（过滤掉"全部"）
        let optionsHtml = '';
        Array.from(select.options).forEach(opt => {
            if (opt.disabled || opt.hidden) return;
            if (opt.textContent.startsWith('全部')) return;
            
            optionsHtml += `
                <div class="select-option" data-value="${opt.value || opt.textContent}">
                    <span class="truncate pr-2">${opt.textContent}</span>
                    <i class="fas fa-check check-icon text-white text-xs" style="display: none;"></i>
                </div>
            `;
        });

        // 构造新触发器
        wrapper.innerHTML = `
            <div class="w-full relative flex items-center cursor-pointer select-trigger ${triggerClasses}">
                <span class="select-value truncate w-full text-left">${basePlaceholder}</span>
                <i class="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-dark-textSecondary text-xs chevron-icon pointer-events-none transition-colors"></i>
                <i class="fas fa-times-circle absolute right-3 top-1/2 -translate-y-1/2 text-dark-textSecondary text-sm clear-icon cursor-pointer z-10" style="display: none;" title="清除"></i>
            </div>
            <div class="select-dropdown">
                ${optionsHtml}
            </div>
        `;
        
        parent.appendChild(wrapper);

        const trigger = wrapper.querySelector('.select-trigger');
        const dropdown = wrapper.querySelector('.select-dropdown');
        const valueSpan = wrapper.querySelector('.select-value');
        const clearIcon = wrapper.querySelector('.clear-icon');
        
        // 状态更新逻辑
        const updateState = (val, text) => {
            dropdown.querySelectorAll('.select-option').forEach(o => {
                o.classList.remove('selected');
                o.querySelector('.check-icon').style.display = 'none';
                if (o.dataset.value === val) {
                    o.classList.add('selected');
                    o.querySelector('.check-icon').style.display = 'block';
                }
            });

            if (val && text && !text.startsWith('全部')) {
                valueSpan.textContent = text;
                valueSpan.classList.add('text-dark-text');
                valueSpan.classList.remove('text-dark-textSecondary');
                wrapper.classList.add('has-value');
            } else {
                valueSpan.textContent = basePlaceholder;
                valueSpan.classList.add('text-dark-textSecondary');
                valueSpan.classList.remove('text-dark-text');
                wrapper.classList.remove('has-value');
            }
        };

        // 初始状态
        const initialSelected = select.options[select.selectedIndex];
        if (initialSelected && !initialSelected.textContent.startsWith('全部')) {
            updateState(initialSelected.value || initialSelected.textContent, initialSelected.textContent);
        } else {
            updateState('', '');
        }

        // 交互绑定
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShowing = dropdown.classList.contains('show');
            document.querySelectorAll('.select-dropdown').forEach(d => {
                d.classList.remove('show');
                const t = d.parentElement.querySelector('.select-trigger');
                if(t) t.style.borderColor = '';
            });
            if (!isShowing) {
                dropdown.classList.add('show');
                trigger.style.borderColor = '#177ddc';
            }
        });

        wrapper.querySelectorAll('.select-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = opt.dataset.value;
                const text = opt.querySelector('span').textContent;
                
                updateState(val, text);
                dropdown.classList.remove('show');
                trigger.style.borderColor = '';
                
                select.value = val;
                select.dispatchEvent(new Event('change'));
            });
        });

        clearIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            updateState('', '');
            dropdown.classList.remove('show');
            trigger.style.borderColor = '';
            
            if (defaultOption) {
                select.value = defaultOption.value || defaultOption.textContent;
            } else {
                select.value = '';
            }
            select.dispatchEvent(new Event('change'));
        });
    });

    // 全局点击收起
    document.addEventListener('click', () => {
        document.querySelectorAll('.select-dropdown').forEach(d => {
            d.classList.remove('show');
            const trigger = d.parentElement.querySelector('.select-trigger');
            if (trigger) trigger.style.borderColor = '';
        });
    });
})();

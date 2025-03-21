import { extension_settings, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

// 插件名称，与文件夹名一致
const extensionName = "prompt-exporter";
// 日志前缀，用于调试输出
const logPrefix = `[${extensionName}]`;
// 导出的JSON文件存储位置
let lastPromptStruct = null;
let exportCount = 0;

// 默认设置
const defaultSettings = {
    enabled: true,
    autoExport: false,
    debugMode: false
};

// 日志函数
function logDebug(...args) {
    if (extension_settings[extensionName]?.debugMode) {
        console.log(logPrefix, "(DEBUG)", ...args);
    }
}

function logInfo(...args) {
    console.log(logPrefix, ...args);
}

function logWarning(...args) {
    console.warn(logPrefix, ...args);
}

function logError(...args) {
    console.error(logPrefix, ...args);
}

// 加载插件设置
function loadSettings() {
    logDebug('加载设置');
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
        saveSettingsDebounced();
    }

    $('#prompt_exporter_enabled').prop('checked', extension_settings[extensionName].enabled);
    $('#prompt_exporter_auto').prop('checked', extension_settings[extensionName].autoExport);
    $('#prompt_exporter_debug').prop('checked', extension_settings[extensionName].debugMode);
    
    logDebug('设置加载完成', extension_settings[extensionName]);
}

// 创建下载链接
function createDownloadLink(data, fileName) {
    try {
        logDebug('创建下载链接', fileName);
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 创建下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        logInfo('文件下载链接已创建', fileName);
        toastr.success(`Prompt结构已导出: ${fileName}`, '导出成功');
        return true;
    } catch (error) {
        logError('创建下载链接失败', error);
        toastr.error(`导出失败: ${error.message}`, '错误');
        return false;
    }
}

// 导出Prompt结构
function exportPromptStruct() {
    try {
        if (!lastPromptStruct) {
            logWarning('没有可用的Prompt结构数据');
            toastr.warning('没有可用的Prompt结构数据，请先发送一条消息', '警告');
            return false;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `prompt_struct_${exportCount}_${timestamp}.json`;
        exportCount++;
        
        return createDownloadLink(lastPromptStruct, fileName);
    } catch (error) {
        logError('导出Prompt结构失败', error);
        toastr.error(`导出失败: ${error.message}`, '错误');
        return false;
    }
}

// 监听事件：CHAT_COMPLETION_PROMPT_READY
function handlePromptReady(prompt_struct) {
    try {
        if (!extension_settings[extensionName].enabled) {
            logDebug('插件已禁用，不处理prompt');
            return;
        }
        
        logDebug('捕获到Prompt结构', prompt_struct);
        
        // 深拷贝以防止修改原始数据
        lastPromptStruct = JSON.parse(JSON.stringify(prompt_struct));
        
        logInfo('已保存最新的Prompt结构数据');
        
        // 如果启用了自动导出，则自动下载文件
        if (extension_settings[extensionName].autoExport) {
            logDebug('自动导出模式已启用，自动导出Prompt结构');
            exportPromptStruct();
        }
    } catch (error) {
        logError('处理Prompt结构失败', error);
    }
}

// 注册插件UI
jQuery(async () => {
    try {
        logInfo('初始化Prompt结构导出器插件');
        
        // 创建插件UI
        const settingsHtml = `
        <div class="prompt-exporter-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Prompt结构导出器</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="flex-container">
                        <label class="checkbox_label" for="prompt_exporter_enabled">
                            <input id="prompt_exporter_enabled" type="checkbox" />
                            <span>启用插件</span>
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label" for="prompt_exporter_auto">
                            <input id="prompt_exporter_auto" type="checkbox" />
                            <span>自动导出(每次消息自动下载)</span>
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label" for="prompt_exporter_debug">
                            <input id="prompt_exporter_debug" type="checkbox" />
                            <span>调试模式</span>
                        </label>
                    </div>
                    <div class="flex-container">
                        <input id="prompt_exporter_button" class="menu_button" type="button" value="导出最新Prompt结构" />
                    </div>
                    <div class="flex-container" id="prompt_exporter_status">
                        <span>上次导出: 未导出</span>
                    </div>
                    <hr class="sysHR" />
                </div>
            </div>
        </div>`;
        
        // 添加插件UI到设置面板
        $("#extensions_settings").append(settingsHtml);
        
        // 绑定事件处理函数
        $('#prompt_exporter_enabled').on('change', function() {
            extension_settings[extensionName].enabled = !!$(this).prop('checked');
            logInfo(`插件已${extension_settings[extensionName].enabled ? '启用' : '禁用'}`);
            saveSettingsDebounced();
        });
        
        $('#prompt_exporter_auto').on('change', function() {
            extension_settings[extensionName].autoExport = !!$(this).prop('checked');
            logInfo(`自动导出模式已${extension_settings[extensionName].autoExport ? '启用' : '禁用'}`);
            saveSettingsDebounced();
        });
        
        $('#prompt_exporter_debug').on('change', function() {
            extension_settings[extensionName].debugMode = !!$(this).prop('checked');
            logInfo(`调试模式已${extension_settings[extensionName].debugMode ? '启用' : '禁用'}`);
            saveSettingsDebounced();
        });
        
        $('#prompt_exporter_button').on('click', function() {
            logDebug('点击导出按钮');
            exportPromptStruct();
        });
        
        // 监听SillyTavern事件
        logDebug('注册事件监听器');
        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, handlePromptReady);
        
        // 加载设置
        loadSettings();
        
        logInfo('插件初始化完成');
    } catch (error) {
        logError('插件初始化失败', error);
    }
});

import React, { useState } from 'react';
import { Book, Code, Database, FileText, FunctionSquare, Layers, Settings } from 'lucide-react';
import { useTranslation } from '../lib/i18n/LanguageContext';

type DocSection = 'overview' | 'settings' | 'generators' | 'functions';

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');
  const { t } = useTranslation();

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Book size={20} /> {t('docs.title')}
            </h3>
          </div>
          <nav className="flex flex-col p-2 space-y-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} /> {t('docs.nav.overview')}
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Settings size={16} /> {t('docs.nav.settings')}
            </button>
            <button
              onClick={() => setActiveSection('generators')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'generators' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Database size={16} /> {t('docs.nav.generators')}
            </button>
            <button
              onClick={() => setActiveSection('functions')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'functions' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FunctionSquare size={16} /> {t('docs.nav.functions')}
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-white rounded-lg shadow border border-gray-200 p-6 overflow-y-auto max-h-[calc(100vh-140px)]">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'settings' && <SettingsGuideSection />}
        {activeSection === 'generators' && <GeneratorReferenceSection />}
        {activeSection === 'functions' && <FunctionReferenceSection />}
      </div>
    </div>
  );
};

const OverviewSection = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">{t('docs.overview.title')}</h2>
            <p className="text-gray-600 leading-relaxed">
            {t('docs.overview.text')}
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 font-bold text-blue-800 mb-2">
                <Database size={18} /> {t('docs.overview.step1.title')}
                </div>
                <p className="text-sm text-blue-700">
                {t('docs.overview.step1.text')}
                </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 font-bold text-orange-800 mb-2">
                <Layers size={18} /> {t('docs.overview.step2.title')}
                </div>
                <p className="text-sm text-orange-700">
                {t('docs.overview.step2.text')}
                </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 font-bold text-green-800 mb-2">
                <Code size={18} /> {t('docs.overview.step3.title')}
                </div>
                <p className="text-sm text-green-700">
                {t('docs.overview.step3.text')}
                </p>
            </div>
            </div>
        </div>
    );
}

const SettingsGuideSection = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">{t('docs.settingsGuide.title')}</h2>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">1</span>
                {t('docs.settingsGuide.datasource.title')}
            </h3>
            <p className="text-sm text-gray-600">
                {t('docs.settingsGuide.datasource.desc')}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                <li>{t('docs.settingsGuide.datasource.items.0')}</li>
                <li>{t('docs.settingsGuide.datasource.items.1')}</li>
                <li>{t('docs.settingsGuide.datasource.items.2')}</li>
            </ul>
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">2</span>
                {t('docs.settingsGuide.collection.title')}
            </h3>
            <p className="text-sm text-gray-600">
                {t('docs.settingsGuide.collection.desc')}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                <li>{t('docs.settingsGuide.collection.items.0')}</li>
                <li>{t('docs.settingsGuide.collection.items.1')}</li>
                <li>{t('docs.settingsGuide.collection.items.2')}</li>
            </ul>
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">3</span>
                {t('docs.settingsGuide.delivery.title')}
            </h3>
            <p className="text-sm text-gray-600">
                {t('docs.settingsGuide.delivery.desc')}
            </p>
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">4</span>
                {t('docs.settingsGuide.database.title')}
            </h3>
            <p className="text-sm text-gray-600">
                {t('docs.settingsGuide.database.desc')}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                <li>{t('docs.settingsGuide.database.items.0')}</li>
                <li>{t('docs.settingsGuide.database.items.1')}</li>
                <li>{t('docs.settingsGuide.database.items.2')}</li>
            </ul>
            </div>
        </div>
    );
}

const GeneratorReferenceSection = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">{t('docs.generators.title')}</h2>
            <p className="text-sm text-gray-600">
            {t('docs.generators.desc')}
            </p>

            <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                <tr>
                    <th className="p-3 w-32">{t('docs.generators.headers.type')}</th>
                    <th className="p-3 w-48">{t('docs.generators.headers.params')}</th>
                    <th className="p-3">{t('docs.generators.headers.desc')}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">static</td>
                    <td className="p-3 font-mono text-xs">value</td>
                    <td className="p-3">{t('docs.generators.items.static.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">randomInt</td>
                    <td className="p-3 font-mono text-xs">min, max</td>
                    <td className="p-3">{t('docs.generators.items.randomInt.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">randomFloat</td>
                    <td className="p-3 font-mono text-xs">min, max, precision</td>
                    <td className="p-3">{t('docs.generators.items.randomFloat.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">sequence</td>
                    <td className="p-3 font-mono text-xs">start, step</td>
                    <td className="p-3">{t('docs.generators.items.sequence.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">uuid</td>
                    <td className="p-3 font-mono text-xs">-</td>
                    <td className="p-3">{t('docs.generators.items.uuid.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">list</td>
                    <td className="p-3 font-mono text-xs">values</td>
                    <td className="p-3">{t('docs.generators.items.list.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">timestamp</td>
                    <td className="p-3 font-mono text-xs">-</td>
                    <td className="p-3">{t('docs.generators.items.timestamp.desc')}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600">sin / cos</td>
                    <td className="p-3 font-mono text-xs">period, amplitude, offset</td>
                    <td className="p-3">{t('docs.generators.items.sin.desc')}</td>
                </tr>
                </tbody>
            </table>
            </div>
        </div>
    );
}

const FunctionReferenceSection = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">{t('docs.functions.title')}</h2>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700">{t('docs.functions.systemVars.title')}</h3>
            <p className="text-sm text-gray-600">{t('docs.functions.systemVars.desc')}</p>
            <div className="flex gap-4">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono border">SYSDATE</code>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono border">SESSSTARTTIME</code>
            </div>
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700">{t('docs.functions.expressionFuncs.title')}</h3>
            <p className="text-sm text-gray-600">
                {t('docs.functions.expressionFuncs.desc')}
            </p>

            <div className="grid lg:grid-cols-2 gap-6">
                <div>
                <h4 className="font-semibold text-gray-600 mb-2 border-b">{t('docs.functions.expressionFuncs.string.title')}</h4>
                <ul className="space-y-2 text-sm">
                    <li><code className="text-blue-600 font-mono">SUBSTR(str, start, [len])</code> - Extract substring (1-based index)</li>
                    <li><code className="text-blue-600 font-mono">INSTR(str, search)</code> - Find position (1-based)</li>
                    <li><code className="text-blue-600 font-mono">LENGTH(str)</code> - String length</li>
                    <li><code className="text-blue-600 font-mono">UPPER(str)</code> / <code className="text-blue-600 font-mono">LOWER(str)</code></li>
                    <li><code className="text-blue-600 font-mono">TRIM(str)</code> - Remove whitespace</li>
                    <li><code className="text-blue-600 font-mono">CONCAT(str1, str2, ...)</code> - Join strings</li>
                    <li><code className="text-blue-600 font-mono">LPAD(str, len, pad)</code> / <code className="text-blue-600 font-mono">RPAD</code></li>
                    <li><code className="text-blue-600 font-mono">REPLACE_STR(str, search, replace)</code></li>
                </ul>
                </div>

                <div>
                <h4 className="font-semibold text-gray-600 mb-2 border-b">{t('docs.functions.expressionFuncs.logic.title')}</h4>
                <ul className="space-y-2 text-sm">
                    <li><code className="text-blue-600 font-mono">IIF(cond, trueVal, falseVal)</code> - If-Then-Else</li>
                    <li><code className="text-blue-600 font-mono">DECODE(val, search1, res1, ..., default)</code> - Switch case</li>
                    <li><code className="text-blue-600 font-mono">ISNULL(val)</code> - Returns true if null/undefined</li>
                    <li><code className="text-blue-600 font-mono">NVL(val, default)</code> - Return default if val is null</li>
                </ul>
                </div>

                <div>
                <h4 className="font-semibold text-gray-600 mb-2 border-b">{t('docs.functions.expressionFuncs.math.title')}</h4>
                <ul className="space-y-2 text-sm">
                    <li><code className="text-blue-600 font-mono">ROUND(num, decimals)</code></li>
                    <li><code className="text-blue-600 font-mono">TRUNC(num, decimals)</code></li>
                    <li><code className="text-blue-600 font-mono">ABS(num)</code>, <code className="text-blue-600 font-mono">CEIL(num)</code>, <code className="text-blue-600 font-mono">FLOOR(num)</code></li>
                    <li><code className="text-blue-600 font-mono">MOD(div, divisor)</code></li>
                    <li><code className="text-blue-600 font-mono">IS_NUMBER(val)</code></li>
                </ul>
                </div>

                <div>
                <h4 className="font-semibold text-gray-600 mb-2 border-b">{t('docs.functions.expressionFuncs.date.title')}</h4>
                <ul className="space-y-2 text-sm">
                    <li><code className="text-blue-600 font-mono">GET_DATE()</code> - Current Date object</li>
                    <li><code className="text-blue-600 font-mono">DATE_DIFF(d1, d2, part)</code> - Diff in 'D', 'H', etc.</li>
                    <li><code className="text-blue-600 font-mono">ADD_TO_DATE(date, amt, part)</code></li>
                    <li><code className="text-blue-600 font-mono">TO_CHAR(val)</code> / <code className="text-blue-600 font-mono">TO_DATE(str)</code></li>
                    <li><code className="text-blue-600 font-mono">MD5(str)</code>, <code className="text-blue-600 font-mono">SHA1(str)</code></li>
                    <li><code className="text-blue-600 font-mono">JSON_VALUE(json, path)</code> - Extract from JSON</li>
                </ul>
                </div>
            </div>
            </div>
        </div>
    );
}

export default Documentation;

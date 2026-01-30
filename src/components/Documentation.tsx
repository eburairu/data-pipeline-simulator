import React, { useState } from 'react';
import { Book, Code, Database, FileText, FunctionSquare, Layers, Settings } from 'lucide-react';

type DocSection = 'overview' | 'settings' | 'generators' | 'functions';

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Book size={20} /> Documentation
            </h3>
          </div>
          <nav className="flex flex-col p-2 space-y-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} /> Overview
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Settings size={16} /> Settings Guide
            </button>
            <button
              onClick={() => setActiveSection('generators')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'generators' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Database size={16} /> Data Generators
            </button>
            <button
              onClick={() => setActiveSection('functions')}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                activeSection === 'functions' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FunctionSquare size={16} /> Functions & Vars
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

const OverviewSection = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Simulator Overview</h2>
    <p className="text-gray-600 leading-relaxed">
      This Data Pipeline Simulator allows you to model, execute, and visualize a complete ETL (Extract, Transform, Load) workflow.
      It simulates the lifecycle of data from generation to final storage, allowing you to test mapping logic,
      understand data flow, and monitor job execution.
    </p>

    <div className="grid md:grid-cols-3 gap-4 mt-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 font-bold text-blue-800 mb-2">
          <Database size={18} /> 1. Generate
        </div>
        <p className="text-sm text-blue-700">
          Create synthetic data using customizable schemas and templates. Simulates external systems sending files.
        </p>
      </div>
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
        <div className="flex items-center gap-2 font-bold text-orange-800 mb-2">
          <Layers size={18} /> 2. Transport
        </div>
        <p className="text-sm text-orange-700">
          Move data through "Collection" and "Delivery" jobs, simulating file transfers, bandwidth, and latency.
        </p>
      </div>
      <div className="p-4 bg-green-50 rounded-lg border border-green-100">
        <div className="flex items-center gap-2 font-bold text-green-800 mb-2">
          <Code size={18} /> 3. Process
        </div>
        <p className="text-sm text-green-700">
          Transform data using visual Mappings (Join, Aggregate, Filter, etc.) and load into Virtual Tables.
        </p>
      </div>
    </div>
  </div>
);

const SettingsGuideSection = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Settings Guide</h2>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">1</span>
        Data Source (Generation)
      </h3>
      <p className="text-sm text-gray-600">
        Configures how source files are created.
      </p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
        <li><strong>Template Mode:</strong> Define raw CSV content with placeholders like <code>${'{'}timestamp{'}'}</code>.</li>
        <li><strong>Schema Mode:</strong> Define columns and their generators (Random, Sequence, etc.) to build CSVs dynamically.</li>
        <li><strong>Execution Interval:</strong> How often a new file is generated.</li>
      </ul>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">2</span>
        Collection (Ingestion)
      </h3>
      <p className="text-sm text-gray-600">
        Simulates picking up files from a source host and moving them to an intermediate "Incoming" area.
      </p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
        <li><strong>Source/Target:</strong> Where files come from and go to.</li>
        <li><strong>Bandwidth:</strong> Simulates transfer speed (chars/sec).</li>
        <li><strong>Rename Pattern:</strong> Rename files during transfer (e.g., add timestamp).</li>
      </ul>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">3</span>
        Delivery (Distribution)
      </h3>
      <p className="text-sm text-gray-600">
        Moves files from the "Incoming" area to "Internal" storage for processing, or distributes them to target hosts.
      </p>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">4</span>
        Database (Virtual)
      </h3>
      <p className="text-sm text-gray-600">
        Defines the schema of the Virtual Database tables.
      </p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
        <li><strong>Tables:</strong> Define table names and columns.</li>
        <li>These tables are the targets for <strong>Target Transformations</strong> in Mappings.</li>
        <li>Data is stored in-memory within the browser.</li>
      </ul>
    </div>
  </div>
);

const GeneratorReferenceSection = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Data Generator Reference</h2>
    <p className="text-sm text-gray-600">
      These generators are used in <strong>Data Source &gt; Schema Mode</strong> to populate column values.
    </p>

    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 font-bold border-b">
          <tr>
            <th className="p-3 w-32">Type</th>
            <th className="p-3 w-48">Parameters</th>
            <th className="p-3">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">static</td>
            <td className="p-3 font-mono text-xs">value</td>
            <td className="p-3">Returns a constant value. Supports variables like <code>${'{'}timestamp{'}'}</code>.</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">randomInt</td>
            <td className="p-3 font-mono text-xs">min, max</td>
            <td className="p-3">Generates a random integer between min and max (inclusive).</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">randomFloat</td>
            <td className="p-3 font-mono text-xs">min, max, precision</td>
            <td className="p-3">Generates a random float number with specified precision.</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">sequence</td>
            <td className="p-3 font-mono text-xs">start, step</td>
            <td className="p-3">Generates an incrementing number. Persists state between file generations.</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">uuid</td>
            <td className="p-3 font-mono text-xs">-</td>
            <td className="p-3">Generates a standard UUID (v4).</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">list</td>
            <td className="p-3 font-mono text-xs">values</td>
            <td className="p-3">Randomly selects a value from a comma-separated list (e.g., "A, B, C").</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">timestamp</td>
            <td className="p-3 font-mono text-xs">-</td>
            <td className="p-3">Returns the current ISO timestamp.</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="p-3 font-mono text-blue-600">sin / cos</td>
            <td className="p-3 font-mono text-xs">period, amplitude, offset</td>
            <td className="p-3">Generates a wave value based on current time. Useful for simulating sensor data.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const FunctionReferenceSection = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Functions & Variables</h2>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700">System Variables</h3>
      <p className="text-sm text-gray-600">Available in Expressions and Filters.</p>
      <div className="flex gap-4">
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono border">SYSDATE</code>
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono border">SESSSTARTTIME</code>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700">Expression Functions</h3>
      <p className="text-sm text-gray-600">
        Use these functions in <strong>Expression</strong>, <strong>Filter</strong>, and <strong>Aggregator</strong> transformations.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-gray-600 mb-2 border-b">String Functions</h4>
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
          <h4 className="font-semibold text-gray-600 mb-2 border-b">Logic & Nulls</h4>
          <ul className="space-y-2 text-sm">
            <li><code className="text-blue-600 font-mono">IIF(cond, trueVal, falseVal)</code> - If-Then-Else</li>
            <li><code className="text-blue-600 font-mono">DECODE(val, search1, res1, ..., default)</code> - Switch case</li>
            <li><code className="text-blue-600 font-mono">ISNULL(val)</code> - Returns true if null/undefined</li>
            <li><code className="text-blue-600 font-mono">NVL(val, default)</code> - Return default if val is null</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-600 mb-2 border-b">Math & Number</h4>
          <ul className="space-y-2 text-sm">
            <li><code className="text-blue-600 font-mono">ROUND(num, decimals)</code></li>
            <li><code className="text-blue-600 font-mono">TRUNC(num, decimals)</code></li>
            <li><code className="text-blue-600 font-mono">ABS(num)</code>, <code className="text-blue-600 font-mono">CEIL(num)</code>, <code className="text-blue-600 font-mono">FLOOR(num)</code></li>
            <li><code className="text-blue-600 font-mono">MOD(div, divisor)</code></li>
            <li><code className="text-blue-600 font-mono">IS_NUMBER(val)</code></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-600 mb-2 border-b">Date & Other</h4>
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

export default Documentation;

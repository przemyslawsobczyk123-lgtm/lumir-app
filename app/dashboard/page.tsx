export default function Dashboard() {
  return (
    <>
      {/* STATS */}
      <div className="grid grid-cols-4 gap-6 mb-6">

        <div className="bg-blue-100 p-6 rounded-2xl font-semibold shadow-md text-slate-700">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm">W toku</div>
        </div>

        <div className="bg-green-100 p-6 rounded-2xl font-semibold shadow-md text-slate-700">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm">Gotowe</div>
        </div>

        <div className="bg-purple-100 p-6 rounded-2xl font-semibold shadow-md text-slate-700">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm">Wyeksportowane</div>
        </div>

        <div className="bg-red-100 p-6 rounded-2xl font-semibold shadow-md text-slate-700">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm">Błędy</div>
        </div>

      </div>

      {/* TABS */}
      <div className="flex gap-8 mb-4 text-[16px] font-semibold text-slate-500">
        <div className="text-purple-600 border-b-2 border-purple-600 pb-1">
          Produkty
        </div>
        <div className="cursor-pointer">Importy kategorii</div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 mb-8">
        {["Wszystkie", "W toku", "Do eksportu", "Wyeksportowane", "Błędy"].map((f, i) => (
          <div
            key={f}
            className={`px-4 py-2 rounded-xl text-sm cursor-pointer ${
              i === 0
                ? "bg-purple-600 text-white shadow"
                : "bg-gray-200 text-slate-500"
            }`}
          >
            {f}
          </div>
        ))}
      </div>

      {/* EMPTY */}
      <div className="flex flex-col items-center justify-center h-[400px] text-center">

        <div className="w-[70px] h-[70px] rounded-xl bg-purple-200 flex items-center justify-center mb-4">
          📦
        </div>

        <div className="text-slate-400 font-medium mb-2">
          Brak produktów
        </div>

        <div className="text-slate-500">
          Dodaj pierwszy produkt aby rozpocząć
        </div>

      </div>
    </>
  );
}
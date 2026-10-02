import type { OfpSummary } from '@/lib/ofp';
import { sizeOf } from '@/lib/terminal/sim';
import { FlightTabs, Head } from './Parts';
import { Terminal } from './Terminal';

const SIZE_HE = { large: 'שדה גדול', medium: 'שדה בינוני', small: 'שדה קטן' } as const;

// The "טרמינל" tab (ADR-053): from a plan until PUSHBACK. Needs passengers and a
// scheduled OUT from the OFP; bags fall back to one per passenger.
export function TerminalScreen({ ofp, tag, airportType }: { ofp: OfpSummary; tag: React.ReactNode; airportType: string | null }) {
  const size = sizeOf(airportType);
  const pax = ofp.weights.pax, out = ofp.sched.out ? Date.parse(ofp.sched.out) : null;
  return (
    <div className="stack">
      <section className="panel">
        <Head ofp={ofp} tag={tag}>
          {pax != null && <>{pax} נוסעים · {ofp.weights.bag_count ?? pax} מזוודות · </>}<bdi>{ofp.origin.icao}</bdi> · {SIZE_HE[size]}
        </Head>
        <FlightTabs active="terminal" />
        {pax && out ? (
          <Terminal
            input={{ seed: ofp.id, pax, bags: ofp.weights.bag_count, seats: ofp.aircraft.seats, outMs: out, size }}
            utcOffset={ofp.orig_utc_offset}
            title={[ofp.callsign, `${ofp.origin.icao}→${ofp.dest.icao}`].filter(Boolean).join(' ')}
          />
        ) : (
          <div className="pb small">בתוכנית חסרים מספר הנוסעים או שעת ה-OUT המתוכננת, ולכן אין סימולציה של הטרמינל.</div>
        )}
      </section>
    </div>
  );
}

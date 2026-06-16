#!/usr/bin/env python3
"""
Analyse rayon DLCScan — lit un export CSV des stats de vente et produit :
- Top / Flop ventes
- Top / Flop marges
- Meilleur rapport CA/m² (rotation)
- Produits "pourris" (faible CA + faible marge + casse)
- Recommandations linéaires

Usage :
  python scripts/analyse-rayon.py chemin/vers/export.csv
"""

import csv, sys, json, math, os
from collections import defaultdict

def parse_money(val):
    """Parse a French-format number to float."""
    if val is None or val.strip() == '' or val.strip() == '-':
        return 0.0
    return float(val.replace(',', '.').replace(' ', ''))

def parse_int(val):
    if val is None or val.strip() == '' or val.strip() == '-':
        return 0
    return int(float(val.replace(',', '.')))

# ── Colonnes du CSV ──
# 0 EAN, 1 Désignation, 2 Rattachement, 3 CA TTC, 4 CA TTC Prosp(%),
# 5 UVC, 6 MPAF HT(%), 7 CA TTC Prosp, 8 CA(%), 9 CA(%) niv,
# 10 Panier, 11 Fréq, 12 UVC prosp, 13 Qté, 14 Qté prosp,
# 15 MPAF, 16 MPAF TTC(%), 17 MPAF prosp, 18 MPAF prosp TTC(%),
# 19 Pds MPAF(%) niv, 20 Pds MPAF(%), 21 Casse PAF, 22 Casse P3N,
# 23 Casse PAF(%), 24 Casse P3N(%), 25 Casse(UVC),
# 26 DATE VALIDITE

HEADERS = [
    'ean', 'designation', 'rattachement', 'ca_ttc', 'ca_ttc_prosp_pct',
    'uvc', 'mpaf_ht_pct', 'ca_ttc_prosp', 'ca_pct', 'ca_pct_niv',
    'panier', 'freq', 'uvc_prosp', 'qte', 'qte_prosp',
    'mpaf', 'mpaf_ttc_pct', 'mpaf_prosp', 'mpaf_prosp_ttc_pct',
    'pds_mpaf_pct_niv', 'pds_mpaf_pct', 'casse_paf', 'casse_p3n',
    'casse_paf_pct', 'casse_p3n_pct', 'casse_uvc',
    'date_validite'
]

def load_csv(path):
    products = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';')
        rows = list(reader)

    # Find header row (skip leading empty or metadata rows)
    header_row_idx = None
    for i, row in enumerate(rows):
        if row and row[0].strip() == '﻿EAN':
            header_row_idx = i
            break
        if row and len(row) > 1 and 'EAN' in row[0].upper():
            header_row_idx = i
            break

    if header_row_idx is None:
        print(f"❌ Pas de ligne d'en-tête trouvée. Première ligne : {rows[0][:4]}")
        sys.exit(1)

    data_rows = rows[header_row_idx + 1:]

    for row in data_rows:
        if not row or len(row) < 3:
            continue
        ean = row[0].strip()
        if not ean or not ean.isdigit():
            continue
        prod = {}
        for i, h in enumerate(HEADERS):
            val = row[i] if i < len(row) else ''
            prod[h] = val
        prod['ca_ttc_num'] = parse_money(prod.get('ca_ttc', '0'))
        prod['mpaf_num'] = parse_money(prod.get('mpaf', '0'))
        prod['mpaf_ht_pct_num'] = parse_money(prod.get('mpaf_ht_pct', '0'))
        prod['uvc_num'] = parse_int(prod.get('uvc', '0'))
        prod['qte_num'] = parse_int(prod.get('qte', '0'))
        prod['freq_num'] = parse_int(prod.get('freq', '0'))
        prod['panier_num'] = parse_money(prod.get('panier', '0'))
        prod['casse_uvc_num'] = parse_int(prod.get('casse_uvc', '0'))
        prod['casse_paf_num'] = parse_money(prod.get('casse_paf', '0'))
        products.append(prod)

    return products

def score_rotation(ca, uvc):
    """Score de rotation : combinaison CA + unités, normalisé."""
    return ca * 0.6 + uvc * 0.4 * (ca / max(uvc, 1)) if uvc > 0 else ca

def analyse(products):
    print("=" * 72)
    print("📊  ANALYSE RAYON SURGELÉS")
    print("=" * 72)

    total_ca = sum(p['ca_ttc_num'] for p in products)
    total_mpaf = sum(p['mpaf_num'] for p in products)
    total_uvc = sum(p['uvc_num'] for p in products)
    print(f"\nPériode : {products[0].get('date_validite', 'N/A')[:10]}" if products else "")
    print(f"Rayon    : SURGELÉS")
    print(f"CA Total : {total_ca:,.2f} € TTC")
    print(f"MPAF     : {total_mpaf:,.2f} €")
    print(f"Taux Marge moyen : {total_mpaf / total_ca * 100:.1f}%" if total_ca else "")
    print(f"Unités vendues   : {total_uvc:,}")
    print(f"Nb références    : {len(products)}")

    # ── 1. TOP VENTES (CA) ──
    print("\n" + "─" * 72)
    print("🏆  TOP 15 — MEILLEURES VENTES (CA TTC)")
    print("─" * 72)
    top_ca = sorted(products, key=lambda p: p['ca_ttc_num'], reverse=True)[:15]
    for i, p in enumerate(top_ca, 1):
        print(f"  {i:2d}. {p['designation'][:45]:45s}  {p['ca_ttc_num']:>8,.2f} €   {p['uvc_num']:>5d} u.   marge {p['mpaf_ht_pct_num']:5.1f}%")

    # ── 2. TOP MARGES (€) ──
    print("\n" + "─" * 72)
    print("💰  TOP 15 — MEILLEURES MARGES (MPAF €)")
    print("─" * 72)
    top_mpaf = sorted(products, key=lambda p: p['mpaf_num'], reverse=True)[:15]
    for i, p in enumerate(top_mpaf, 1):
        print(f"  {i:2d}. {p['designation'][:45]:45s}  {p['mpaf_num']:>8,.2f} €   ({p['mpaf_ht_pct_num']:5.1f}%)   CA {p['ca_ttc_num']:>8,.2f} €")

    # ── 3. MEILLEUR RAPPORT VENTES/MARGE (efficacité) ──
    print("\n" + "─" * 72)
    print("🎯  TOP 15 — MEILLEUR RAPPORT CA×MARGE (rentabilité globale)")
    print("─" * 72)
    def efficacite(p):
        return p['ca_ttc_num'] * (p['mpaf_ht_pct_num'] / 100.0) * p['freq_num']
    top_eff = sorted(products, key=lambda p: efficacite(p), reverse=True)[:15]
    for i, p in enumerate(top_eff, 1):
        score = efficacite(p)
        print(f"  {i:2d}. {p['designation'][:45]:45s}  score {score:>10,.0f}   CA {p['ca_ttc_num']:>8,.2f}€   marge {p['mpaf_ht_pct_num']:5.1f}%   freq {p['freq_num']:>3d}")

    # ── 4. PRODUITS À FORTE PROGRESSION ──
    # On utilise le % de CA TTC Prosp (colonne 4) comme proxy
    # Si disponible, "CA TTC Prosp(%)" = pourcentage des ventes faites par les prospects
    # Ce n'est pas exactement une progression, mais pour ce CSV on regarde les produits avec
    # un CA non-négligeable ET un fort % prospect = potentiel de progression
    print("\n" + "─" * 72)
    print("📈  TOP 10 — PRODUITS À POTENTIEL (CA significatif + forte marge)")
    print("─" * 72)
    # Produits avec CA > 100€, filtrés par meilleur ratio marge * volume
    potentiels = [p for p in products if p['ca_ttc_num'] > 100]
    top_pot = sorted(potentiels, key=lambda p: p['mpaf_ht_pct_num'] * p['freq_num'], reverse=True)[:10]
    for i, p in enumerate(top_pot, 1):
        print(f"  {i:2d}. {p['designation'][:45]:45s}  marge {p['mpaf_ht_pct_num']:5.1f}%   CA {p['ca_ttc_num']:>8,.2f}€   freq {p['freq_num']:>3d}   panier {p['panier_num']:>5.2f}€")

    # ── 5. PRODUITS "POURRIS" (faible CA + faible marge + casse éventuelle) ──
    print("\n" + "─" * 72)
    print("💀  TOP 20 — PRODUITS À RISQUE (faible rotation + faible marge)")
    print("─" * 72)
    # Score de "pourriture" : faible CA * faible marge, pondéré par le nombre d'unités (coute de la place)
    def risk_score(p):
        if p['uvc_num'] == 0:
            return float('inf')  # never sold = maximum risk
        # Plus le score est bas, plus c'est risqué
        return (p['ca_ttc_num'] / max(p['uvc_num'], 1)) * (p['mpaf_ht_pct_num'] / 100.0)
    risky = sorted([p for p in products if p['uvc_num'] > 0], key=lambda p: risk_score(p))[:20]
    for i, p in enumerate(risky, 1):
        rs = risk_score(p)
        casse_str = f"  casse {p['casse_uvc_num']}u" if p['casse_uvc_num'] > 0 else ""
        print(f"  {i:2d}. {p['designation'][:42]:42s}  CA {p['ca_ttc_num']:>7,.2f}€  uvc {p['uvc_num']:>4d}  marge {p['mpaf_ht_pct_num']:5.1f}%{casse_str}")

    # ── 6. PRODUITS JAMAIS VENDUS ──
    print("\n" + "─" * 72)
    print("🚫  PRODUITS NON VENDUS (0 unité) — à retirer du linéaire ?")
    print("─" * 72)
    zeros = [p for p in products if p['uvc_num'] == 0 and p['ca_ttc_num'] == 0]
    if zeros:
        for i, p in enumerate(zeros[:10], 1):
            print(f"  {i:2d}. {p['designation'][:50]:50s}")
        if len(zeros) > 10:
            print(f"  ... et {len(zeros)-10} autres (total {len(zeros)})")
    else:
        print("  (aucun)")

    # ── 7. PRODUITS AVEC CASSE ──
    print("\n" + "─" * 72)
    print("🗑️  PRODUITS AVEC CASSE SIGNIFICATIVE")
    print("─" * 72)
    casse_products = sorted([p for p in products if p['casse_paf_num'] > 0],
                            key=lambda p: p['casse_paf_num'], reverse=True)[:10]
    if casse_products:
        for i, p in enumerate(casse_products, 1):
            ratio = p['casse_paf_num'] / max(p['ca_ttc_num'], 1) * 100
            print(f"  {i:2d}. {p['designation'][:42]:42s}  casse {p['casse_paf_num']:>7,.2f}€  ({ratio:4.1f}% du CA)  {p['casse_uvc_num']}u")
    else:
        print("  (aucune casse enregistrée)")

    # ── RÉSUMÉ EXÉCUTIF ──
    print("\n" + "=" * 72)
    print("📋  RÉSUMÉ EXÉCUTIF — RECOMMANDATIONS LINÉAIRES")
    print("=" * 72)

    print(f"""
📌 PRODUITS À GARDER ABSOLUMENT (top 5 CA + top 5 marge) :
   • {top_ca[0]['designation'][:40]} — {top_ca[0]['ca_ttc_num']:>8,.2f}€ CA, {top_ca[0]['mpaf_ht_pct_num']:.1f}% marge
   • {top_ca[1]['designation'][:40]} — {top_ca[1]['ca_ttc_num']:>8,.2f}€ CA
   • {top_ca[2]['designation'][:40]} — {top_ca[2]['ca_ttc_num']:>8,.2f}€ CA
   + vérifier les marges

📌 PRODUITS À SURVEILLER (top 10 "pourris") :
   • {risky[0]['designation'][:40]} — CA {risky[0]['ca_ttc_num']:>7,.2f}€, marge {risky[0]['mpaf_ht_pct_num']:.1f}%
   • {risky[1]['designation'][:40]} — CA {risky[1]['ca_ttc_num']:>7,.2f}€
""")

    # ── PRODUITS STAR (fort CA + forte marge) ──
    print("⭐  PRODUITS STAR (CA > 500€ ET marge > 20%)")
    print("─" * 72)
    stars = [p for p in products if p['ca_ttc_num'] > 500 and p['mpaf_ht_pct_num'] > 20]
    stars_sorted = sorted(stars, key=lambda p: p['ca_ttc_num'] * p['mpaf_ht_pct_num'], reverse=True)
    for i, p in enumerate(stars_sorted[:10], 1):
        print(f"  {i:2d}. {p['designation'][:45]:45s}  CA {p['ca_ttc_num']:>8,.2f}€   marge {p['mpaf_ht_pct_num']:5.1f}%   €/u {p['mpaf_num']/max(p['uvc_num'],1):.2f}")

    print("\n✅  Analyse terminée.")


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path or not os.path.exists(path):
        print("Usage : python scripts/analyse-rayon.py <fichier_csv>")
        sys.exit(1)
    products = load_csv(path)
    analyse(products)

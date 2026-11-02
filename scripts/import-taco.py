"""Importa a planilha oficial NEPA/Unicamp sem substituir dados ausentes por zero.
Uso: python scripts/import-taco.py caminho/planilha.xlsx
"""
import sys, json, hashlib
from pathlib import Path
import openpyxl

source = Path(sys.argv[1])
sheet = openpyxl.load_workbook(source, data_only=True).worksheets[0]
fields = ['umidade','kcal','energia_kj','proteina','lipideos','colesterol','carboidratos','fibra','cinzas','calcio','magnesio',None,'manganes','fosforo','ferro','sodio','potassio','cobre','zinco','retinol','re','rae','tiamina','riboflavina','piridoxina','niacina','vitamina_c']
foods, category = [], ''
for row in sheet.values:
    if isinstance(row[0], str) and row[1] is None and row[2] is None:
        category = row[0].strip()
    if not isinstance(row[0], (int,float)) or not isinstance(row[1],str):
        continue
    nutrients = {key: value for key,value in zip(fields,row[2:29]) if key}
    foods.append(dict(id='taco-'+str(int(row[0])), numero=int(row[0]), nome=row[1].strip(), categoria=category, quantidade_padrao=100, unidade='g', fonte='TACO', **nutrients))
assert len(foods)==597 and {f['numero'] for f in foods}==set(range(1,598))
target=Path('assets/js/taco-data.js')
target.write_text('// Gerado por scripts/import-taco.py. Valores originais por 100 g de parte comestível.\n'
    '// Fonte: https://nepa.unicamp.br/publicacoes/tabela-taco-excel/\n'
    '// SHA256 da planilha: '+hashlib.sha256(source.read_bytes()).hexdigest()+'\n'
    'export const TACO = '+json.dumps(foods,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(f'{len(foods)} alimentos importados em {target}')
Path('assets/js/taco-calories.js').write_text('// Referência TACO por 100 g; gerada pela mesma planilha de taco-data.js.\nexport const tacoCalories = '+json.dumps([[f['nome'],f['kcal']] for f in foods],ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')

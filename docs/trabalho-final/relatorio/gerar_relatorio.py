"""Gera o relatório técnico do Projeto Final (Infraestrutura de Servidores) em PDF.

    python gerar_relatorio.py            # requer: pip install reportlab pillow

Saída: Relatorio-FastStreet-ProjetoFinal.pdf (nesta pasta).
Imagens em ./imagens. Prints opcionais ausentes aparecem como quadro "inserir captura";
basta salvar o arquivo com o nome indicado e gerar de novo.
"""
from __future__ import annotations

import os
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, Image, KeepTogether,
                                NextPageTemplate, PageBreak, PageTemplate, Paragraph, Preformatted,
                                Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

AQUI = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(AQUI, 'imagens')
SAIDA = os.path.join(AQUI, 'Relatorio-FastStreet-ProjetoFinal.pdf')
REPO = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))

# ── Fontes (Arial e Consolas do Windows; acentos do português) ────────────────────────────
FONTES = r'C:\Windows\Fonts'
pdfmetrics.registerFont(TTFont('Sans', os.path.join(FONTES, 'arial.ttf')))
pdfmetrics.registerFont(TTFont('Sans-B', os.path.join(FONTES, 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('Sans-I', os.path.join(FONTES, 'ariali.ttf')))
pdfmetrics.registerFont(TTFont('Sans-BI', os.path.join(FONTES, 'arialbi.ttf')))
pdfmetrics.registerFont(TTFont('Mono', os.path.join(FONTES, 'consola.ttf')))
pdfmetrics.registerFont(TTFont('Mono-B', os.path.join(FONTES, 'consolab.ttf')))
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-B', italic='Sans-I', boldItalic='Sans-BI')
pdfmetrics.registerFontFamily('Mono', normal='Mono', bold='Mono-B', italic='Mono', boldItalic='Mono-B')

# ── Paleta e estilos ────────────────────────────────────────────────────────────────────
TINTA = colors.HexColor('#1F2933')
SUAVE = colors.HexColor('#52606D')
ACENTO = colors.HexColor('#C2410C')       # laranja do Fast Street, escurecido para impressão
FUNDO = colors.HexColor('#F3F4F6')
LINHA = colors.HexColor('#CBD2D9')
OK = colors.HexColor('#15803D')

base = dict(fontName='Sans', textColor=TINTA)
S = {
    'corpo': ParagraphStyle('corpo', **base, fontSize=10.5, leading=15, alignment=TA_JUSTIFY, spaceAfter=6),
    'item': ParagraphStyle('item', **base, fontSize=10.5, leading=14.5, leftIndent=14, bulletIndent=4, spaceAfter=2),
    'h1': ParagraphStyle('h1', fontName='Sans-B', fontSize=15, leading=19, textColor=TINTA, spaceBefore=14,
                         spaceAfter=8),
    'h2': ParagraphStyle('h2', fontName='Sans-B', fontSize=11.5, leading=15, textColor=ACENTO, spaceBefore=10,
                         spaceAfter=4),
    'cel': ParagraphStyle('cel', **base, fontSize=8.8, leading=11.2),
    'celb': ParagraphStyle('celb', fontName='Sans-B', fontSize=8.8, leading=11.2, textColor=colors.white),
    'leg': ParagraphStyle('leg', fontName='Sans-I', fontSize=8.8, leading=11, textColor=SUAVE,
                          alignment=TA_CENTER, spaceBefore=3, spaceAfter=10),
    'cod': ParagraphStyle('cod', fontName='Mono', fontSize=7.6, leading=9.6, textColor=TINTA),
    'nota': ParagraphStyle('nota', fontName='Sans', fontSize=9.2, leading=12.5, textColor=SUAVE),
    'toc1': ParagraphStyle('toc1', fontName='Sans-B', fontSize=10.5, leading=17, leftIndent=0),
    'toc2': ParagraphStyle('toc2', fontName='Sans', fontSize=9.5, leading=14, leftIndent=16),
}


def C(texto: str) -> str:
    """Trecho de código dentro de um parágrafo."""
    return f'<font name="Mono" size="9">{escape(texto)}</font>'


def P(texto: str, estilo: str = 'corpo') -> Paragraph:
    return Paragraph(texto, S[estilo])


def itens(lista: list[str]) -> list[Paragraph]:
    return [Paragraph(t, S['item'], bulletText='•') for t in lista]


class Titulo(Paragraph):
    """Título que entra no sumário."""

    def __init__(self, texto: str, nivel: int):
        super().__init__(texto, S['h1' if nivel == 0 else 'h2'])
        self.nivel = nivel
        self.texto_sumario = texto


def H1(texto: str):
    return [CondPageBreak(5 * cm), Titulo(texto, 0)]


def H2(texto: str):
    return [CondPageBreak(3 * cm), Titulo(texto, 1)]


def tabela(dados, larguras, cabecalho=True, zebra=True):
    linhas = []
    for i, linha in enumerate(dados):
        estilo = S['celb'] if (cabecalho and i == 0) else S['cel']
        linhas.append([c if isinstance(c, Flowable) else Paragraph(str(c), estilo) for c in linha])
    t = Table(linhas, colWidths=larguras, repeatRows=1 if cabecalho else 0)
    cmds = [('GRID', (0, 0), (-1, -1), 0.4, LINHA), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    if cabecalho:
        cmds.append(('BACKGROUND', (0, 0), (-1, 0), TINTA))
    if zebra:
        for r in range(1 if cabecalho else 0, len(dados)):
            if r % 2 == 0:
                cmds.append(('BACKGROUND', (0, r), (-1, r), FUNDO))
    t.setStyle(TableStyle(cmds))
    return t


def codigo(texto: str, largura=16 * cm, colunas=104):
    import textwrap
    linhas = []
    for linha in texto.strip('\n').expandtabs(4).split('\n'):
        if len(linha) <= colunas:
            linhas.append(linha)
        else:   # quebra linhas longas (Preformatted não quebra sozinho) com recuo de continuação
            recuo = ' ' * (len(linha) - len(linha.lstrip()) + 4)
            linhas += textwrap.wrap(linha, colunas, subsequent_indent=recuo, break_long_words=True,
                                    drop_whitespace=False) or ['']
    # Uma linha da tabela por bloco de 55 linhas: tabelas quebram entre linhas, não dentro de uma célula.
    blocos = [[Preformatted('\n'.join(linhas[i:i + 55]), S['cod'])] for i in range(0, len(linhas), 55)]
    t = Table(blocos, colWidths=[largura])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), FUNDO), ('BOX', (0, 0), (-1, -1), 0.4, LINHA),
                           ('LEFTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 5),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return t


FIG = [1]   # a Figura 1 é o diagrama de arquitetura


def figura(arquivo: str, legenda: str, largura=16 * cm, max_altura=9 * cm):
    FIG[0] += 1
    rotulo = f'<b>Figura {FIG[0]}</b> — {legenda}'
    caminho = os.path.join(IMG, arquivo)
    if os.path.exists(caminho):
        from PIL import Image as PILImage
        w, h = PILImage.open(caminho).size
        escala = min(largura / w, max_altura / h)
        corpo = Image(caminho, width=w * escala, height=h * escala)
        moldura = Table([[corpo]], colWidths=[w * escala + 4])
        moldura.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.4, LINHA), ('LEFTPADDING', (0, 0), (-1, -1), 2),
                                     ('RIGHTPADDING', (0, 0), (-1, -1), 2), ('TOPPADDING', (0, 0), (-1, -1), 2),
                                     ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
    else:
        aviso = Paragraph(f'<b>Inserir captura</b>: salvar como <font name="Mono">imagens/{arquivo}</font> '
                          'e gerar o relatório de novo.', S['nota'])
        moldura = Table([[aviso]], colWidths=[largura], rowHeights=[3 * cm])
        moldura.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.8, ACENTO), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                     ('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    return KeepTogether([moldura, Paragraph(rotulo, S['leg'])])


def teste(codigo_teste: str, titulo: str, objetivo: str, procedimento: str, resultado: str, interpretacao: str):
    cab = Paragraph(f'<b>{codigo_teste}</b> · {titulo}', S['celb'])
    linhas = [[cab, ''], ['Objetivo', objetivo], ['Procedimento', procedimento], ['Resultado', resultado],
              ['Interpretação', interpretacao]]
    dados = [[linhas[0][0], '']] + [[Paragraph(f'<b>{a}</b>', S['cel']), Paragraph(b, S['cel'])] for a, b in linhas[1:]]
    t = Table(dados, colWidths=[2.6 * cm, 13.4 * cm])
    t.setStyle(TableStyle([('SPAN', (0, 0), (-1, 0)), ('BACKGROUND', (0, 0), (-1, 0), ACENTO),
                           ('BACKGROUND', (0, 1), (0, -1), FUNDO), ('GRID', (0, 0), (-1, -1), 0.4, LINHA),
                           ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 5),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    return [t, Spacer(1, 8)]


# ── Diagrama de arquitetura (vetorial) ──────────────────────────────────────────────────
def diagrama():
    d = Drawing(16 * cm, 8.4 * cm)
    W = 16 * cm

    def caixa(x, y, w, h, titulo, sub='', cor=colors.white, borda=TINTA, tam=8):
        d.add(Rect(x, y, w, h, rx=4, ry=4, fillColor=cor, strokeColor=borda, strokeWidth=0.8))
        d.add(String(x + w / 2, y + h - 12, titulo, fontName='Sans-B', fontSize=tam, textAnchor='middle',
                     fillColor=TINTA))
        for i, linha in enumerate(sub.split('\n') if sub else []):
            d.add(String(x + w / 2, y + h - 23 - i * 9, linha, fontName='Sans', fontSize=6.8, textAnchor='middle',
                         fillColor=SUAVE))

    def seta(x1, y1, x2, y2, rotulo='', cor=TINTA, dx=0, dy=4):
        d.add(Line(x1, y1, x2, y2, strokeColor=cor, strokeWidth=1))
        import math
        a = math.atan2(y2 - y1, x2 - x1)
        p = [x2, y2, x2 - 6 * math.cos(a - 0.4), y2 - 6 * math.sin(a - 0.4), x2 - 6 * math.cos(a + 0.4),
             y2 - 6 * math.sin(a + 0.4)]
        d.add(Polygon(p, fillColor=cor, strokeColor=cor))
        if rotulo:
            d.add(String((x1 + x2) / 2 + dx, (y1 + y2) / 2 + dy, rotulo, fontName='Sans', fontSize=6.5,
                         textAnchor='middle', fillColor=SUAVE))

    # Fora da AWS
    caixa(0, 6.2 * cm, 3.1 * cm, 1.6 * cm, 'Usuário', 'app (Expo) / Safari\n4G ou Wi-Fi')
    caixa(0, 3.6 * cm, 3.1 * cm, 1.6 * cm, 'Administrador', 'SSH com chave\n(IP de casa /32)')
    caixa(0, 0.6 * cm, 3.1 * cm, 1.8 * cm, 'DuckDNS', 'faststreet.duckdns.org\nA → 18.116.147.33')
    # AWS
    d.add(Rect(3.7 * cm, 0.1 * cm, W - 3.8 * cm, 8.2 * cm, rx=6, ry=6, fillColor=colors.HexColor('#FFF7ED'),
               strokeColor=ACENTO, strokeWidth=0.8, strokeDashArray=[3, 2]))
    d.add(String(3.9 * cm, 7.95 * cm, 'AWS · us-east-2 (Ohio)', fontName='Sans-B', fontSize=7.5, fillColor=ACENTO))
    caixa(4.0 * cm, 3.0 * cm, 2.4 * cm, 3.6 * cm, 'Security Group', '22: IP admin /32\n80: 0.0.0.0/0\n443: 0.0.0.0/0\n'
          '3306/3333:\nfechadas', cor=colors.HexColor('#FEF3C7'))
    # EC2
    d.add(Rect(7.0 * cm, 0.4 * cm, 6.0 * cm, 7.3 * cm, rx=5, ry=5, fillColor=colors.white, strokeColor=TINTA,
               strokeWidth=0.9))
    d.add(String(7.15 * cm, 7.4 * cm, 'EC2 t3.small · Ubuntu 24.04 · EBS 20 GB · IP elástico', fontName='Sans-B',
                 fontSize=6.6, fillColor=TINTA))
    caixa(7.3 * cm, 5.5 * cm, 5.4 * cm, 1.5 * cm, 'UFW → Nginx (:80 / :443)', 'TLS Let\'s Encrypt · logs · limite/IP',
          cor=colors.HexColor('#E0F2FE'))
    caixa(7.3 * cm, 3.5 * cm, 2.55 * cm, 1.5 * cm, 'App web', '/app/ (estático)\n/var/www/…', tam=7.5)
    caixa(10.15 * cm, 3.5 * cm, 2.55 * cm, 1.5 * cm, 'Fast Street API', 'Node 22 · systemd\n127.0.0.1:3333',
          cor=colors.HexColor('#DCFCE7'), tam=7.5)
    caixa(10.15 * cm, 1.2 * cm, 2.55 * cm, 1.6 * cm, 'MySQL 8.0', '127.0.0.1:3306\n/var/lib/mysql', tam=7.5)
    caixa(7.3 * cm, 1.2 * cm, 2.55 * cm, 1.6 * cm, 'Backup (timer)', 'mysqldump + fotos\n+ configurações', tam=7.5)
    # Serviços AWS
    caixa(13.5 * cm, 4.6 * cm, 2.3 * cm, 1.7 * cm, 'S3', 'cópia externa\ndos backups', cor=colors.HexColor('#F3E8FF'))
    caixa(13.5 * cm, 1.8 * cm, 2.3 * cm, 1.9 * cm, 'CloudWatch', 'memória, disco\nlogs do Nginx',
          cor=colors.HexColor('#F3E8FF'))
    # Setas (rótulos posicionados à mão para não cruzar as caixas)
    def rotulo(x, y, texto, anchor='start', cor=SUAVE):
        d.add(String(x, y, texto, fontName='Sans', fontSize=6.5, textAnchor=anchor, fillColor=cor))

    roxo = colors.HexColor('#7E22CE')
    seta(3.1 * cm, 7.0 * cm, 4.0 * cm, 6.3 * cm)
    rotulo(3.15 * cm, 7.25 * cm, 'HTTPS 443')
    seta(3.1 * cm, 4.4 * cm, 4.0 * cm, 4.4 * cm)
    rotulo(3.15 * cm, 4.6 * cm, 'SSH 22')
    seta(6.4 * cm, 5.6 * cm, 7.3 * cm, 6.1 * cm)
    seta(8.6 * cm, 5.5 * cm, 8.6 * cm, 5.0 * cm)
    seta(11.4 * cm, 5.5 * cm, 11.4 * cm, 5.0 * cm)
    rotulo(11.55 * cm, 5.17 * cm, 'proxy_pass')
    seta(11.4 * cm, 3.5 * cm, 11.4 * cm, 2.8 * cm)
    seta(9.85 * cm, 2.0 * cm, 10.15 * cm, 2.0 * cm)
    seta(13.0 * cm, 5.45 * cm, 13.5 * cm, 5.45 * cm, cor=roxo)
    rotulo(13.03 * cm, 5.6 * cm, 'backup', cor=roxo)
    seta(13.0 * cm, 2.75 * cm, 13.5 * cm, 2.75 * cm, cor=roxo)
    rotulo(13.03 * cm, 2.9 * cm, 'agente', cor=roxo)
    d.add(String(1.55 * cm, 3.05 * cm, '(DNS resolve o nome)', fontName='Sans-I', fontSize=6.3, textAnchor='middle',
                 fillColor=SUAVE))
    return d


# ── Páginas ─────────────────────────────────────────────────────────────────────────────
class Documento(BaseDocTemplate):
    def __init__(self, arquivo):
        super().__init__(arquivo, pagesize=A4, leftMargin=2.5 * cm, rightMargin=2.0 * cm, topMargin=2.2 * cm,
                         bottomMargin=2.0 * cm, title='Fast Street em produção — Relatório técnico',
                         author='Thiago de Lima Machado', subject='Projeto Final · Infraestrutura de Servidores')
        moldura = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f')
        self.addPageTemplates([PageTemplate('capa', [moldura], onPage=lambda c, d: None),
                               PageTemplate('corpo', [moldura], onPage=self.rodape)])

    def rodape(self, c, d):
        c.saveState()
        c.setFont('Sans', 8)
        c.setFillColor(SUAVE)
        c.drawString(self.leftMargin, 1.2 * cm, 'Fast Street em produção · Projeto Final de Infraestrutura de Servidores')
        c.drawRightString(A4[0] - self.rightMargin, 1.2 * cm, f'{c.getPageNumber()}')
        c.setStrokeColor(LINHA)
        c.line(self.leftMargin, 1.5 * cm, A4[0] - self.rightMargin, 1.5 * cm)
        c.restoreState()

    def afterFlowable(self, f):
        if isinstance(f, Titulo):
            self.notify('TOCEntry', (f.nivel, f.texto_sumario, self.page))


def capa():
    e = [Spacer(1, 2.2 * cm),
         P('<font size="10" color="#52606D">CENTRO UNIVERSITÁRIO FAG · INFRAESTRUTURA DE SERVIDORES</font>', 'corpo'),
         Spacer(1, 2.6 * cm),
         Paragraph('<font color="#C2410C">PROJETO FINAL · PROEX EM PRODUÇÃO</font>',
                   ParagraphStyle('k', fontName='Sans-B', fontSize=11, leading=14)),
         Spacer(1, 8),
         Paragraph('Fast Street em produção na AWS',
                   ParagraphStyle('t', fontName='Sans-B', fontSize=26, leading=31, textColor=TINTA)),
         Spacer(1, 10),
         Paragraph('Implantação, administração, segurança, monitoramento e recuperação da Fast Street API '
                   'e do app web numa instância EC2 com Ubuntu Server, Nginx e systemd',
                   ParagraphStyle('s', fontName='Sans', fontSize=12.5, leading=17, textColor=SUAVE)),
         Spacer(1, 3.2 * cm)]
    dados = [['Integrante', 'Thiago de Lima Machado (trabalho individual)'],
             ['PROEX', 'Fast Street — app para pilotos e organizadores de eventos automotivos'],
             ['Demonstração', 'https://faststreet.duckdns.org  (app web em /app/ · API nas demais rotas)'],
             ['Código', 'github.com/th14goLM/Fast-Street (privado; acesso combinado com o professor)'],
             ['Ambiente', 'AWS EC2 t3.small · Ubuntu Server 24.04 LTS · us-east-2 (Ohio)']]
    t = Table([[Paragraph(f'<b>{a}</b>', S['cel']), Paragraph(b, S['cel'])] for a, b in dados],
              colWidths=[3.2 * cm, 13.3 * cm])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.4, LINHA), ('TOPPADDING', (0, 0), (-1, -1), 5),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    e += [t, Spacer(1, 3.0 * cm), P('<font color="#52606D">Cascavel – PR · novembro de 2026</font>')]
    return e


def sumario():
    toc = TableOfContents()
    toc.levelStyles = [S['toc1'], S['toc2']]
    toc.dotsMinLevel = 0
    return [Paragraph('Sumário', S['h1']), toc]


def ler(caminho_rel: str) -> str:
    with open(os.path.join(REPO, caminho_rel), encoding='utf-8') as f:
        return f.read()


# ── Conteúdo ────────────────────────────────────────────────────────────────────────────
def conteudo():
    e = []
    L = 16.5 * cm

    # 1 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('1. Identificação')
    e.append(P('O <b>Fast Street</b> é o projeto de PROEX escolhido para este trabalho. É um aplicativo para pilotos '
               'e organizadores de eventos automotivos (track days, arrancadas, encontros): o piloto cria a conta, '
               'cadastra a garagem de veículos, encontra eventos próximos pelo feed (filtrado por distância) e se '
               'inscreve; o organizador publica eventos e registra resultados. O app é <b>mobile</b> (React Native '
               'com Expo); por isso, conforme o cenário 4 do item 1.3 do enunciado, o componente implantado na EC2 é '
               'o <b>serviço efetivamente usado pelo app</b>: a <b>Fast Street API</b> (Node.js + MySQL). Como '
               'complemento, a versão web do próprio app também é entregue pelo Nginx da instância.'))
    e.append(P('Funcionalidades demonstradas (R01), a partir de outro dispositivo e de outra rede (4G):'))
    e += itens([
        '<b>Cadastro, confirmação de e-mail e login</b> (' + C('POST /auth/register') + ', ' +
        C('GET /auth/verify-email') + ', ' + C('POST /auth/login') + ', ' + C('POST /auth/refresh') + ').',
        '<b>Feed de eventos por distância</b> (' + C('GET /eventos/feed?raioKm=50') + '), com a lista de cidades '
        'atendidas (' + C('GET /cidades') + ') e o detalhe do evento.',
        '<b>App web</b> em ' + C('https://faststreet.duckdns.org') + ' (Safari/Chrome do celular), servido pelo '
        'Nginx em ' + C('/app/') + ' e consumindo a mesma API.'])
    e.append(P('Trabalho <b>individual</b> (Thiago de Lima Machado): provisionamento, implantação, operação, testes e '
               'documentação. Todo o histórico de execução, com horário, comando, resultado e interpretação, está em '
               + C('docs/trabalho-final/diario.md') + ' no repositório.'))

    # 2 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('2. Tecnologias')
    e.append(tabela([
        ['Camada', 'Tecnologia (versão em produção)', 'Papel'],
        ['Nuvem', 'AWS: EC2, EBS, IP elástico, Security Group, IAM, S3, CloudWatch', 'Infraestrutura (IaaS)'],
        ['Sistema operacional', 'Ubuntu Server 24.04.5 LTS, kernel 7.0 (aws)', 'Usuários, processos, rede, logs'],
        ['Servidor web', 'Nginx 1.24.0', 'TLS, proxy reverso da API e arquivos do app web'],
        ['Gerência de serviços', 'systemd 255 (unidades e timers próprios)', 'Início no boot, reinício, logs'],
        ['Backend', 'Node.js 22.23 + Express 5 + TypeScript; JWT; bcrypt; Zod', 'Fast Street API'],
        ['Banco de dados', 'MySQL 8.0.46 (pacote do Ubuntu)', 'Persistência (usuários, eventos, inscrições)'],
        ['Frontend', 'React Native / Expo SDK 58 (Expo Router); exportação web', 'App mobile e app web'],
        ['HTTPS / DNS', "Let's Encrypt via certbot 5.10 (snap); DuckDNS", 'Certificado e nome público gratuitos'],
        ['Segurança do host', 'UFW, fail2ban, unattended-upgrades, OpenSSH', 'Firewall, anti-força-bruta, patches'],
        ['Observabilidade', 'Logs do Nginx, journald, Amazon CloudWatch Agent 1.300075', 'Métricas e logs'],
    ], [3.3 * cm, 7.8 * cm, 5.4 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('<b>Persistência:</b> banco MySQL em ' + C('/var/lib/mysql') + ' e fotos enviadas pelos usuários em '
               + C('/var/lib/fast-street/uploads') + ', ambos no volume EBS (sobrevivem a reinício do serviço, reboot '
               'e stop/start). <b>Serviços externos:</b> DuckDNS (DNS), Let\'s Encrypt (certificado), S3 e '
               'CloudWatch (mesma conta AWS). O envio real de e-mail (SMTP) está desligado em produção: o link de '
               'confirmação é registrado no log da API — limitação conhecida e documentada.'))
    e.append(P('<b>Adaptações de implantação</b> (permitidas pelo item 1 do enunciado): a API ganhou a variável '
               + C('HOST') + ' para escutar só em ' + C('127.0.0.1') + ' atrás do Nginx; em produção ela recusa '
               'subir com segredos de exemplo; o app recebeu ' + C('experiments.baseUrl = "/app"') + ' para a '
               'exportação web. A implantação anterior em Docker Compose foi substituída por serviços nativos do '
               'systemd para atender aos requisitos R07/R08 da disciplina.'))

    # 3 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('3. Arquitetura')
    e.append(KeepTogether([diagrama(), Paragraph('<b>Figura 1</b> — Arquitetura implantada: navegador/app → DNS → '
                                                 'Security Group → EC2 (UFW → Nginx → API → MySQL).', S['leg'])]))
    e.append(P('Caminho de uma requisição (' + C('GET https://faststreet.duckdns.org/eventos/feed') + '):'))
    e += itens([
        'O app resolve o nome no DNS (registro A no DuckDNS) e obtém o IP elástico <b>18.116.147.33</b>.',
        'O pacote entra na VPC; o <b>Security Group</b> permite TCP 443 de qualquer origem.',
        'No Ubuntu, o <b>UFW</b> também permite 443; o <b>Nginx</b> faz o handshake TLS, aplica o limite por IP e '
        'registra a requisição em ' + C('fast-street.access.log') + '.',
        'Rotas ' + C('/app/…') + ' são arquivos estáticos (o Nginx responde sozinho); as demais seguem por '
        + C('proxy_pass') + ' para ' + C('127.0.0.1:3333') + ', porta que <b>não</b> é alcançável pela Internet.',
        'A <b>API</b> (processo Node gerenciado pelo systemd, usuário sem privilégios) consulta o <b>MySQL</b> '
        'pelo loopback e devolve JSON; o Nginx devolve a resposta cifrada ao cliente.'])
    e.append(tabela([
        ['Componente', 'Onde', 'Porta / interface', 'Gerenciado por', 'Usuário'],
        ['Nginx', 'EC2', '0.0.0.0:80 e :443', 'nginx.service', 'root / www-data'],
        ['Fast Street API', '/opt/fast-street/api', '127.0.0.1:3333', 'fast-street-api.service', 'faststreet'],
        ['MySQL 8.0', '/var/lib/mysql', '127.0.0.1:3306', 'mysql.service', 'mysql'],
        ['App web (SPA)', '/var/www/fast-street-web/app', 'via Nginx em /app/', '—', 'root (644)'],
        ['Backup', '/var/backups/fast-street → S3', '—', 'fast-street-backup.timer', 'root (700)'],
        ['DNS dinâmico', 'DuckDNS', '—', 'duckdns.timer', 'dinâmico'],
        ['SSH', 'EC2', '0.0.0.0:22 (SG: só IP admin)', 'ssh.service', 'contas com chave'],
    ], [3.0 * cm, 3.9 * cm, 3.2 * cm, 3.6 * cm, 2.8 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('<b>Limite técnico:</b> uma única EC2 é ponto único de falha (sem balanceador, réplica ou outra zona). '
               'Se a instância falhar, a recuperação parte do backup externo (RPO de até 24 h pelo backup diário; '
               'RTO de minutos a horas, conforme o procedimento da seção 10).'))

    # 4 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('4. Provisionamento')
    e.append(tabela([
        ['Item', 'Configuração', 'Justificativa'],
        ['Região', 'us-east-2 (Ohio), zona us-east-2a', 'Preço on-demand baixo; latência ~150 ms do Brasil, '
                                                          'aceitável para o app'],
        ['Instância', 'i-019cd349ad6ada4ea “fast-street”, t3.small (2 vCPU, 2 GiB)',
         'Node + MySQL + build da API não cabem com folga em 1 GiB; swap de 2 GiB como margem'],
        ['AMI / SO', 'Ubuntu Server 24.04 LTS (x86-64)', 'LTS suportada até 2029; pacotes oficiais'],
        ['Disco', 'Volume EBS de 20 GB (raiz); uso atual ≈ 34%', 'Sistema, banco, fotos e backups locais'],
        ['Rede', 'VPC padrão, sub-rede pública, IP privado 172.31.4.206, IP elástico 18.116.147.33',
         'IP estável entre stop/start; o DNS não precisa mudar'],
        ['Acesso', 'Par de chaves fast-street.pem (fora do repositório) + chave pessoal ed25519',
         'Autenticação só por chave'],
        ['Papel IAM', 'fast-street-ec2: CloudWatchAgentServerPolicy + S3 (Put/Get/List no bucket)',
         'Credenciais temporárias, sem chave de acesso no disco'],
    ], [2.4 * cm, 7.0 * cm, 7.1 * cm]))
    e.append(Spacer(1, 6))
    e.append(figura('ec2-instancias.png', 'Console EC2: instância fast-street em execução, t3.small, 3/3 '
                    'verificações de status aprovadas.', max_altura=3.2 * cm))
    e.append(figura('ec2-resumo.png', 'Resumo da instância: IP público/elástico, IP privado, tipo e rede '
                    '(ARN com o ID da conta ocultado).', max_altura=5.5 * cm))
    e += H2('4.1 Custos e créditos do Free Plan (R02)')
    e.append(P('A conta usa o Free Plan (créditos iniciais de US$ 100). Estimativa mensal com os preços públicos '
               'on-demand de us-east-2, para o ambiente ligado 24 h por dia:'))
    e.append(tabela([
        ['Recurso', 'Base de cálculo', 'US$/mês (estimado)'],
        ['EC2 t3.small', 'US$ 0,0208/h × 730 h', '≈ 15,18'],
        ['IPv4 público (IP elástico)', 'US$ 0,005/h × 730 h (cobrado mesmo com a instância parada)', '≈ 3,65'],
        ['EBS 20 GB', '≈ US$ 0,08–0,10/GB-mês (cobrado mesmo com a instância parada)', '≈ 1,60–2,00'],
        ['S3', 'poucos MB de backup', '&lt; 0,01'],
        ['CloudWatch', '3 métricas personalizadas e 2 grupos de log: dentro do nível gratuito', '≈ 0'],
        ['Total', '', '≈ 20,50 (≈ 5 meses de créditos)'],
    ], [4.2 * cm, 8.8 * cm, 3.5 * cm]))
    e.append(Spacer(1, 4))
    e.append(P('Nos períodos sem uso a instância é <b>interrompida</b> (stop): deixa de custar a hora de EC2, mas o '
               'volume e o IPv4 continuam cobrados. O saldo é conferido no painel <i>Free plan status</i>.', 'nota'))
    e.append(figura('free-plan.png', 'Painel Free plan status com o saldo de créditos e os dias restantes (nome, '
                    'e-mail e dados de faturamento ocultados).', largura=7.5 * cm, max_altura=3.2 * cm))

    # 5 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('5. Administração')
    e.append(P('O acesso é feito por SSH com chave; não há login remoto como root nem por senha. Por ser um trabalho '
               'individual, há uma identidade administrativa pessoal com chave própria, além da conta padrão da AMI '
               '(usada só para o deploy, por ser dona da <i>deploy key</i> somente leitura do GitHub) e de usuários '
               'de serviço sem shell.'))
    e.append(tabela([
        ['Conta', 'Tipo', 'Acesso', 'Para quê'],
        ['thiago', 'Administrador pessoal', 'Chave ed25519 própria; grupo sudo; grupos adm e systemd-journal',
         'Administração diária; cada sudo fica em /var/log/auth.log'],
        ['ubuntu', 'Conta da AMI', 'Chave fast-street.pem; sudo', 'git pull com a deploy key e deploy-api.sh'],
        ['faststreet', 'Serviço (sem senha, shell nologin)', 'Nenhum login', 'Executa a API; lê api.env (grupo)'],
        ['cwagent, mysql, www-data', 'Serviço', 'Nenhum login', 'CloudWatch Agent, MySQL, workers do Nginx'],
    ], [3.0 * cm, 3.6 * cm, 5.0 * cm, 4.9 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('Política de SSH em ' + C('/etc/ssh/sshd_config.d/10-fast-street.conf') + ' (validada com '
               + C('sshd -t') + ' antes do reload) e verificação efetiva:'))
    e.append(codigo('''$ sudo sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries)'
maxauthtries 3
permitrootlogin no
passwordauthentication no
kbdinteractiveauthentication no
$ ssh -o PubkeyAuthentication=no ubuntu@18.116.147.33     # tentativa por senha
ubuntu@18.116.147.33: Permission denied (publickey).'''))
    e.append(Spacer(1, 6))
    e.append(P('Permissões que protegem segredos e dados (saída de ' + C('ls -ld') + '/' + C('stat') + '):'))
    e.append(tabela([
        ['Caminho', 'Dono:grupo', 'Modo', 'Motivo'],
        ['/etc/fast-street/api.env', 'root:faststreet', '640', 'root escreve, a API lê, os demais nada'],
        ['/etc/fast-street/duckdns.env', 'root:root', '600', 'token do DNS'],
        ['/opt/fast-street (código em execução)', 'root:root', '755/644', 'a API não consegue alterar o próprio código'],
        ['/var/lib/fast-street/uploads', 'faststreet', '750', 'única pasta em que a API escreve'],
        ['/var/backups/fast-street', 'root:root', '700', 'backups contêm e-mails e hashes de senha'],
    ], [5.6 * cm, 2.8 * cm, 1.6 * cm, 6.5 * cm]))

    # 6 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('6. Publicação')
    e.append(P('O ambiente é reproduzível por scripts versionados em ' + C('infra/') + '. Sequência executada '
               '(detalhes e saídas no diário, 24/11/2026):'))
    e.append(tabela([
        ['Etapa', 'Comando / arquivo', 'Resultado'],
        ['1. Código', 'git clone (deploy key somente leitura) em ~/fast-street', 'Commit em produção: e6223f7'],
        ['2. Sistema', 'sudo bash infra/scripts/provisionar.sh',
         'Nginx, MySQL, Node 22, certbot, AWS CLI, UFW, fail2ban; usuário faststreet; diretórios; unidades'],
        ['3. Banco', 'CREATE DATABASE/USER (senha aleatória de 48 hex) + importação do dump',
         '15 tabelas, migrations 001–004; usuário só com privilégios em fast_street.*'],
        ['4. Configuração', '/etc/fast-street/api.env (640) a partir de infra/config/api.env.example',
         'Segredos fora do repositório'],
        ['5. API', 'bash infra/scripts/deploy-api.sh', 'Build, cópia para /opt/fast-street, restart, teste de saúde'],
        ['6. Nginx', '/etc/nginx/sites-available/fast-street + nginx -t + reload', 'Proxy reverso e app web'],
        ['7. HTTPS', 'certbot --nginx -d faststreet.duckdns.org', 'Certificado válido até 22/02/2027'],
        ['8. App web', 'infra/scripts/publicar-web.ps1 (build no PC) → instalar-web.sh',
         'Versão em releases/ com troca atômica e rollback'],
    ], [2.3 * cm, 7.0 * cm, 7.2 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('Trecho da unidade systemd da API (arquivo completo no Anexo B):'))
    e.append(codigo('''[Service]
User=faststreet
WorkingDirectory=/opt/fast-street/api
EnvironmentFile=/etc/fast-street/api.env          # segredos (640 root:faststreet)
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1                        # só o Nginx alcança a API
ExecStartPre=/usr/bin/node dist/db/migrate.js     # migrations pendentes antes de subir
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
ProtectSystem=strict                              # sistema somente leitura para o processo
ReadWritePaths=/var/lib/fast-street/uploads'''))
    e.append(Spacer(1, 6))
    e.append(P('Trecho do site do Nginx (arquivo completo no Anexo A) e validação:'))
    e.append(codigo('''location /app/ {                       # app web: arquivos estáticos (SPA)
    root /var/www/fast-street-web;
    try_files $uri $uri/ /app/index.html;
}
location / {                           # API: proxy reverso
    limit_req zone=fast_street_por_ip burst=40 nodelay;
    proxy_pass http://fast_street_api;  # upstream 127.0.0.1:3333 (keepalive)
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
$ sudo nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful'''))
    e.append(figura('app-web-login.jpg', 'App web servido pelo Nginx da EC2 (tela de login em /app/login, '
                    'viewport de celular).', largura=5 * cm, max_altura=8.5 * cm))

    # 7 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('7. Segurança')
    e.append(figura('sg-regras-entrada.png', 'Regras de entrada do Security Group: 22 só do IP do administrador '
                    '(ocultado), 80 e 443 públicas; nenhuma regra para 3306 ou 3333.', max_altura=4 * cm))
    e.append(P('Portas em escuta na EC2 (' + C('sudo ss -lntp') + ', resumido): apenas SSH e Nginx expostos; API e '
               'MySQL só no loopback — por isso não precisam (nem devem) ter regra no Security Group.'))
    e.append(codigo('''0.0.0.0:22      sshd           0.0.0.0:80   nginx        0.0.0.0:443   nginx
127.0.0.1:3333  node (API)     127.0.0.1:3306  mysqld    127.0.0.1:33060  mysqld (X protocol)'''))
    e.append(Spacer(1, 6))
    e.append(tabela([
        ['Controle', 'Implementação', 'Evidência'],
        ['Firewall da AWS', 'Security Group mínimo (figura acima)', 'Console'],
        ['Firewall do host', 'UFW: deny incoming; permite OpenSSH e Nginx Full', 'ufw status verbose'],
        ['Força bruta', 'fail2ban (jail sshd) + SSH só por chave', 'fail2ban-client status sshd'],
        ['Atualizações', 'unattended-upgrades aplica patches de segurança diariamente (kernel 7.0.0-1018 e '
                         'libssh em 24/11); o restante aplicado com apt-get upgrade e reboot: 0 pendentes',
         C('apt list --upgradable') + ' (teste T9)'],
        ['Segredos', 'api.env 640; .gitignore para .env*, *.pem, dumps; a API recusa segredos de exemplo; '
                     'backups sem o api.env; segredos antigos destruídos com shred', 'diário 19/11 e 24/11'],
        ['Menor privilégio', 'Usuário faststreet, ProtectSystem=strict, código de root em /opt', 'unidade systemd'],
        ['Credenciais AWS', 'Papel IAM (sem chave no disco); o servidor não consegue apagar backups no S3',
         'aws s3 rm → AccessDenied'],
        ['Superfície', 'Docker e a stack antiga removidos; MySQL só em 127.0.0.1', 'dpkg -l, ss -lntp'],
    ], [3.0 * cm, 8.8 * cm, 4.7 * cm]))
    e.append(Spacer(1, 6))
    e += H2('7.1 HTTPS')
    e.append(P('HTTP transmite tudo em texto puro (senhas e tokens visíveis a quem intercepta a rede); HTTPS é o '
               'HTTP dentro de um canal TLS cifrado, e o certificado prova que o servidor responde pelo nome. A Let\'s '
               'Encrypt emite certificados para <b>nomes</b>, não para IPs automáticos: por isso foi criado o nome '
               'gratuito ' + C('faststreet.duckdns.org') + ' (sem compra de domínio), apontado para o IP elástico. '
               'A validação usa o desafio HTTP-01 pela porta 80, que fica aberta e redireciona para HTTPS.'))
    e.append(codigo('''$ sudo certbot certificates
  Certificate Name: faststreet.duckdns.org
    Expiry Date: 2027-02-22 01:35:59+00:00 (VALID: 89 days)
$ sudo certbot renew --dry-run
Congratulations, all simulated renewals succeeded
$ curl -I http://18.116.147.33/cidades   →  301 https://faststreet.duckdns.org/cidades'''))
    e.append(Spacer(1, 4))
    e.append(P('A renovação é automática (' + C('snap.certbot.renew.timer') + '). O ' + C('duckdns.timer') +
               ' atualiza o registro A no boot e a cada 30 min — com IP elástico o endereço não muda, mas o timer '
               'cobre o cenário de IP automático após stop/start (item 8.5).', 'nota'))

    # 8 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('8. Operação')
    e.append(P('Todos os componentes são iniciados pelo systemd, sem terminal aberto:'))
    e.append(codigo('''$ for s in nginx mysql fast-street-api fast-street-backup.timer duckdns.timer amazon-cloudwatch-agent ufw fail2ban; do ...
nginx                        enabled=enabled   active=active
mysql                        enabled=enabled   active=active
fast-street-api              enabled=enabled   active=active
fast-street-backup.timer     enabled=enabled   active=active
duckdns.timer                enabled=enabled   active=active
amazon-cloudwatch-agent      enabled=enabled   active=active
ufw                          enabled=enabled   active=active
fail2ban                     enabled=enabled   active=active'''))
    e.append(Spacer(1, 6))
    e += H2('8.1 Logs')
    e.append(P('O Nginx grava um log próprio com o tempo total e o status devolvido pela API, o que separa erro do '
               'Nginx de erro da aplicação. A API registra no journal do systemd.'))
    e.append(codigo('''# /var/log/nginx/fast-street.access.log
IP - [24/Nov/2026:02:44:33 +0000] "GET /cidades HTTP/1.1" 200 317 rt=0.002 upstream=127.0.0.1:3333 ustatus=200 urt=0.002
IP - [24/Nov/2026:02:44:34 +0000] "GET /nao-existe HTTP/1.1" 404 64 rt=0.001 upstream=127.0.0.1:3333 ustatus=404 urt=0.000
#     status entregue ─┘   tempo total ─┘   para onde foi ─┘   status da API ─┘   tempo da API ─┘

$ journalctl -u fast-street-api -n 3
node[9773]: Migrations em dia.
systemd[1]: Started fast-street-api.service - Fast Street API (backend do PROEX).
node[9786]: Fast Street API ouvindo em http://127.0.0.1:3333 (production)'''))
    e.append(Spacer(1, 6))
    e += H2('8.2 Métricas')
    e.append(P('Comandos de inspeção (' + C('uptime') + ', ' + C('free -h') + ', ' + C('df -h') + ', ' +
               C('ps aux --sort=-%mem') + ', ' + C('ss -lntp') + ') e, de forma contínua, o <b>CloudWatch Agent</b>, '
               'que envia a cada 60 s memória, disco e swap (namespace FastStreet/EC2) e os logs do Nginx (grupos '
               + C('/fast-street/nginx/access') + ' e ' + C('/error') + ', retenção de 14 dias). As métricas padrão da '
               'EC2 vêm do hipervisor, que não enxerga a memória nem o disco dentro do Linux; o agente, rodando no SO, '
               'completa essa visão. Medição de referência (24/11):'))
    e.append(tabela([
        ['Recurso', 'Medida', 'Leitura'],
        ['Memória', '1,9 GiB total; ~0,9 GiB em uso; ~1,0 GiB disponível', 'Folga confortável; swap sem uso'],
        ['Disco', '19 GB; 34% em uso (após remover o Docker: era 46%)', 'Sem risco de lotação'],
        ['CPU', 'load average 0,0–0,2 (2 vCPUs)', 'Ociosa; t3 acumula créditos de CPU'],
        ['API', '~60 MB de RAM; respostas de 2–15 ms no servidor', 'Latência percebida vem da rede'],
    ], [2.4 * cm, 8.0 * cm, 6.1 * cm]))
    e.append(Spacer(1, 4))
    e.append(figura('cloudwatch-logs.png', 'CloudWatch Logs, grupo /fast-street/nginx/access (IPs ocultados): '
                    'varreduras externas em / (301/302), acessos do administrador e, às 23:28:28–31, dois 502 '
                    'durante o reboot do T9 (Nginx já de pé, API ainda iniciando), seguidos de 200.', max_altura=8 * cm))
    e += H2('8.3 Diferenças de diagnóstico')
    e.append(tabela([
        ['Sintoma', 'Como diferenciar'],
        ['CPU alta × memória insuficiente', 'load average alto em top/uptime × coluna available baixa no free e '
                                            'swap crescendo'],
        ['Disco cheio × RAM ocupada', 'Use% perto de 100% no df -h × free -h'],
        ['Processo parado × firewall', 'connection refused (nada em ss -lntp) × timeout de fora com curl local OK'],
        ['Erro do Nginx × erro da API', '502 com “connect() failed” no error.log × status 4xx/5xx com ustatus igual'],
        ['404 × 502', '404: a API respondeu “rota não existe”; 502: o Nginx não obteve resposta da API'],
    ], [5.0 * cm, 11.5 * cm]))

    # 9 ─────────────────────────────────────────────────────────────────────────────────
    e += H1('9. Testes')
    e.append(P('Cada teste segue o padrão de evidências do item 13.3 (objetivo, procedimento, resultado e '
               'interpretação). Horários em UTC, 24/11/2026.'))
    e += teste('T1 · R01', 'Acesso externo por outra rede (4G)',
               'Usar a aplicação a partir do iPhone, fora da rede do administrador.',
               'Wi-Fi desligado; Safari em https://faststreet.duckdns.org; login e feed. Logs acompanhados no '
               'CloudWatch (Live Tail).',
               'Origem 177.51.x.x (operadora), User-Agent iPhone/Safari: GET /app/feed 200 (upstream “-”: '
               'estático); POST /auth/refresh 200; GET /eventos/feed 200 (880 B, 5 ms); GET /auth/me 304; '
               'GET /cidades 200.',
               'O serviço responde independentemente do computador do estudante. O log separa o que o Nginx '
               'entregou sozinho (app web) do que foi encaminhado à API (upstream 127.0.0.1:3333).')
    e += teste('T2 · R08', 'Reinicialização do sistema operacional',
               'Provar que o PROEX volta sem iniciar nada à mão.',
               'sudo systemctl reboot às 02:49:29; sondagem externa de /cidades a cada 3 s; após reconectar, '
               'uptime -s, systemctl is-active e journalctl -b.',
               'Fora do ar às 02:50:10; de volta (HTTP 200) às 02:50:31. Boot em 11,8 s; todos os serviços '
               'enabled/active; API com novo PID (1032): “Migrations em dia” → “ouvindo em 127.0.0.1:3333”.',
               'Unidades habilitadas (WantedBy=multi-user.target) sobem no boot na ordem declarada '
               '(After=mysql.service). Reboot ≠ stop/start: mesma máquina e mesmo IP.')
    e += teste('T3 · R08', 'Reinício automático em falha do processo',
               'Verificar a política Restart=on-failure.',
               'sudo kill -9 &lt;PID da API&gt; às 02:45:35 (simula queda do processo).',
               '1 s depois: activating; 8 s depois: active, novo PID, NRestarts=1; journal: “Scheduled restart job”.',
               'O systemd religou a API em ~5 s (RestartSec=5) sem intervenção. Uma parada intencional '
               '(systemctl stop) não dispara reinício.')
    e.append(CondPageBreak(7 * cm))
    e += teste('T4 · R11', 'Incidente controlado: backend parado',
               'Introduzir uma falha reversível, diagnosticar e recuperar.',
               'Estado saudável → sudo systemctl stop fast-street-api → acesso ao app → systemctl status, ss -lntp, '
               'error.log → sudo systemctl start fast-street-api → nova verificação externa.',
               '02:45:15 /health 200 → stop → /cidades <b>502</b> {"code":"API_INDISPONIVEL"}; status inactive '
               '(dead); nada escutando em 3333; error.log: connect() failed (111: Connection refused) while '
               'connecting to upstream → 02:45:17 start → 02:45:19 /cidades 200 (servidor e PC).',
               'O Nginx continuou ativo; 502 = sem resposta válida do upstream. Connection refused indica que o '
               'pacote chegou e nenhum processo escuta (diferente de timeout, típico de firewall ou travamento).')
    e += teste('T5 · R10', 'Requisição normal × rota inexistente',
               'Localizar no log uma requisição válida e outra para rota inexistente.',
               'curl /cidades e /nao-existe; leitura do fast-street.access.log.',
               '/cidades → 200 (ustatus=200, 2 ms); /nao-existe → 404 (ustatus=404).',
               'Nos dois casos o Nginx encaminhou à API; o 404 foi gerado pela aplicação, não pelo Nginx.')
    e += teste('T6 · R13', 'Acesso simultâneo (5 clientes)',
               'Observar o comportamento com requisições sobrepostas, em baixa intensidade.',
               'infra/scripts/teste-concorrencia.ps1 no PC: 5 jobs paralelos em GET /cidades, cada um com '
               'User-Agent teste-concorrencia/N.',
               '5/5 HTTP 200, 545–563 ms no cliente, todas em ~1,4 s; no access.log as 5 linhas no mesmo '
               'segundo com rt=0.002 (2 ms no servidor).',
               'Quase todo o tempo é rede Brasil–Ohio e handshake TLS. O Nginx atende as conexões de forma '
               'assíncrona e reaproveita conexões com a API (keepalive). Gargalos prováveis com mais carga: CPU '
               'burstable da t3 (2 vCPUs), pool de conexões do MySQL e o processo Node único.')
    e += teste('T7 · R12', 'Backup externo e restauração',
               'Comprovar cópia fora da EC2 e reconstituição de dados e configuração.',
               'systemctl start fast-street-backup (envio ao S3); download do S3 com sha256sum -c; restaurar.sh no '
               'banco separado fast_street_restore; diff do unit file extraído; baixar-backup.ps1 no PC.',
               'S3: SHA256SUMS, banco.sql.gz, config.tar.gz, fotos.tar.gz; somas OK; 15 tabelas restauradas com '
               'contagens iguais à produção (1 usuário/8 cidades); unit file idêntico; cópia no PC com somas OK. '
               'GET anônimo ao S3 → 403; aws s3 rm pelo servidor → AccessDenied.',
               'O backup protege os dados que o Git não guarda. A restauração em banco separado não toca a '
               'produção; o papel IAM sem permissão de apagar protege as cópias contra um invasor no servidor.')
    e += teste('T8 · R07', 'Validação antes de recarregar o Nginx',
               'Evitar derrubar o site com uma configuração inválida.',
               'Instalação da nova configuração com nginx -t antes do reload e restauração automática em caso de erro.',
               '1ª tentativa: unknown directive "http2" (forma “http2 on;” só existe no Nginx ≥ 1.25.1; o Ubuntu '
               'tem o 1.24) → arquivo anterior restaurado, sem reload. Corrigido para “listen 443 ssl http2”; '
               '2ª tentativa: test is successful → reload.',
               'O site não caiu: nginx -t impediu a aplicação de um arquivo inválido. Lição: conferir a versão '
               'instalada antes de copiar exemplos.')
    e += teste('T9 · R09', 'Atualizações de segurança e incidente real de acesso',
               'Manter o sistema atualizado e restabelecer a administração sem afrouxar o firewall.',
               'Ao religar a instância, ssh deu timeout; diagnóstico do IP de origem; ajuste da regra SSH para o '
               'novo /32. Depois: apt list --upgradable, apt-get upgrade e reboot de verificação (23:28 UTC).',
               'O IP doméstico havia mudado (…220 → …202). Com a regra corrigida, o SSH voltou. O unattended-'
               'upgrades já tinha instalado kernel e libssh; 12 pacotes do systemd aplicados; 0 pendentes. '
               'Reboot: site fora às 23:28:18 e 200 às 23:28:37; kernel 7.0.0-1018; serviços ativos. No '
               'CloudWatch, dois 502 (23:28:28–31) mostram o Nginx de pé antes de a API terminar de iniciar.',
               'Timeout com o site no ar indica filtro de rede, não serviço parado. A correção certa é atualizar o '
               '/32 — nunca abrir a 22 para 0.0.0.0/0. Patches automáticos reduzem a janela de exposição.')

    # 10 ────────────────────────────────────────────────────────────────────────────────
    e += H1('10. Continuidade')
    e += H2('10.1 Backup')
    e.append(tabela([
        ['Item protegido', 'Origem', 'Arquivo no backup'],
        ['Banco fast_street', 'MySQL (mysqldump --single-transaction)', 'banco.sql.gz'],
        ['Fotos dos usuários', '/var/lib/fast-street/uploads', 'fotos.tar.gz'],
        ['Nginx, unidades systemd, scripts', '/etc/nginx, /etc/systemd/system, /opt/fast-street/infra', 'config.tar.gz'],
        ['Roteiro de instalação', 'infra/scripts/provisionar.sh e docs/trabalho-final (repositório)', 'Git + config.tar.gz'],
        ['Segredos (api.env, token DNS)', '/etc/fast-street', '<b>Não</b> entram: ficam no cofre de senhas'],
    ], [4.2 * cm, 7.3 * cm, 5.0 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('Agendamento por ' + C('fast-street-backup.timer') + ' (diário, 03:00 UTC, ' + C('Persistent=true') +
               ': roda ao religar se a instância estava parada). Destinos: ' + C('/var/backups/fast-street') +
               ' (7 dias) → <b>S3</b> ' + C('s3://fast-street-backups-thiago/fast-street/') + ' (SSE-S3, sem acesso '
               'público) → cópia no computador do administrador (' + C('baixar-backup.ps1') + '), com verificação '
               'SHA-256.'))
    e.append(figura('s3-bucket.png', 'Bucket S3 de backup criado na mesma região, com acesso público bloqueado.',
                    max_altura=3.5 * cm))
    e.append(figura('iam-papel.png', 'Papel IAM da instância: política gerenciada do CloudWatch Agent e política em '
                    'linha que só permite gravar, ler e listar o bucket de backup.', max_altura=7 * cm))
    e += H2('10.2 Ações em caso de falha')
    e.append(tabela([
        ['Falha', 'Ação'],
        ['API fora (502)', 'systemctl status / journalctl -u fast-street-api → corrigir → systemctl start'],
        ['Site inacessível', 'Estado da EC2 e status checks no console → SG → systemctl status nginx → nginx -t'],
        ['SSH com timeout', 'Conferir se o IP do administrador mudou (checkip) e atualizar a regra /32 no SG'],
        ['Disco cheio', 'df -h; du -sh /var/log/* /var/backups/*; limpar só o que for conhecido'],
        ['Configuração quebrada', 'restaurar.sh … config (extrai do backup) ou git checkout de infra/'],
        ['App web com defeito', 'sudo bash instalar-web.sh --rollback (versão anterior em releases/)'],
        ['Perda da instância', 'Nova EC2 → provisionar.sh → restaurar.sh … tudo com o último backup do S3 → '
                               'reassociar o IP elástico'],
    ], [3.8 * cm, 12.7 * cm]))
    e += H2('10.3 Recursos ativos e plano de encerramento (R14)')
    e.append(tabela([
        ['Recurso', 'Identificação', 'Após a avaliação'],
        ['EC2', 'i-019cd349ad6ada4ea (t3.small)', 'Stop nos períodos sem uso; terminate se o PROEX não continuar'],
        ['EBS', 'volume raiz de 20 GB', 'Excluído junto com a instância (após backup final)'],
        ['IP elástico', '18.116.147.33', 'Liberar após o terminate (senão continua cobrado)'],
        ['S3', 'fast-street-backups-thiago', 'Baixar a última cópia; esvaziar e excluir'],
        ['CloudWatch', 'FastStreet/EC2 e /fast-street/nginx/*', 'Excluir grupos de log'],
        ['IAM', 'papel fast-street-ec2', 'Excluir'],
        ['DNS', 'faststreet.duckdns.org', 'Remover o domínio no DuckDNS'],
    ], [2.6 * cm, 5.6 * cm, 8.3 * cm]))
    e.append(Spacer(1, 6))
    e.append(P('Ordem segura: (1) backup final e cópia no PC; (2) conferir que a cópia restaura; (3) só então '
               'terminate da instância, liberação do IP e exclusão dos demais recursos; (4) conferir no Billing que '
               'nada continua cobrando. Encerrar (terminate) é diferente de interromper (stop) e apaga o volume raiz.'))

    # Referências ─────────────────────────────────────────────────────────────────────────
    e += H1('Referências')
    e += itens([
        'Especificação do trabalho: “Infraestrutura de Servidores — Projeto Final: PROEX em produção”.',
        'AWS. Amazon EC2 User Guide: instâncias, Security Groups, parar e iniciar. docs.aws.amazon.com/AWSEC2',
        'AWS. Amazon CloudWatch Agent. docs.aws.amazon.com/AmazonCloudWatch',
        'Nginx. Module ngx_http_proxy_module. nginx.org/en/docs/http/ngx_http_proxy_module.html',
        'Ubuntu Server documentation: Nginx e firewall (UFW). ubuntu.com/server/docs',
        'Certbot. Instructions: Nginx on Linux (snap). certbot.eff.org',
        'systemd. systemd.service, systemd.exec e systemd.timer (man pages). freedesktop.org',
        'Expo. Publishing websites (web.output e experiments.baseUrl). docs.expo.dev'])

    # Anexos ──────────────────────────────────────────────────────────────────────────────
    e.append(PageBreak())
    e += H1('Anexo A — Site do Nginx (/etc/nginx/sites-available/fast-street)')
    e.append(codigo(ler('infra/nginx/fast-street.https.conf')))
    e += H1('Anexo B — Unidades systemd')
    e.append(codigo(ler('infra/systemd/fast-street-api.service')))
    e.append(Spacer(1, 6))
    e.append(codigo(ler('infra/systemd/fast-street-backup.timer')))
    e += H1('Anexo C — Script de backup (infra/scripts/backup.sh)')
    e.append(codigo(ler('infra/scripts/backup.sh')))
    return e


def main():
    doc = Documento(SAIDA)
    story = capa() + [NextPageTemplate('corpo'), PageBreak()] + sumario() + [PageBreak()] + conteudo()
    doc.multiBuild(story)
    print(SAIDA)


if __name__ == '__main__':
    main()

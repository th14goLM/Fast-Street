"""Gera o roteiro de estudo da apresentação do Projeto Final em PDF.

    python gerar_roteiro.py            # requer: pip install reportlab

Saída: ../Roteiro-Apresentacao-FastStreet.pdf (pasta docs/trabalho-final).
Fonte do conteúdo: roteiro-apresentacao.md, 01-arquitetura.md, 03-operacao.md, guia-estudo.md e diario.md.
"""
from __future__ import annotations

import os
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (CondPageBreak, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, '..', 'Roteiro-Apresentacao-FastStreet.pdf'))


# ── Fontes: Arial/Consolas no Windows; Liberation (métricas da Arial) no Linux ─────────────
def _registrar_fontes() -> None:
    candidatos = [
        (r'C:\Windows\Fonts', 'arial.ttf', 'arialbd.ttf', 'ariali.ttf', 'arialbi.ttf', 'consola.ttf', 'consolab.ttf'),
        ('/usr/share/fonts/truetype/liberation', 'LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf',
         'LiberationSans-Italic.ttf', 'LiberationSans-BoldItalic.ttf', 'LiberationMono-Regular.ttf',
         'LiberationMono-Bold.ttf'),
    ]
    for pasta, *arquivos in candidatos:
        caminhos = [os.path.join(pasta, a) for a in arquivos]
        if all(os.path.exists(c) for c in caminhos):
            for nome, caminho in zip(['Sans', 'Sans-B', 'Sans-I', 'Sans-BI', 'Mono', 'Mono-B'], caminhos):
                pdfmetrics.registerFont(TTFont(nome, caminho))
            pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-B', italic='Sans-I', boldItalic='Sans-BI')
            pdfmetrics.registerFontFamily('Mono', normal='Mono', bold='Mono-B', italic='Mono', boldItalic='Mono-B')
            return
    raise SystemExit('Fontes não encontradas (Arial/Consolas ou Liberation).')


_registrar_fontes()

# ── Paleta e estilos (os mesmos do relatório técnico) ─────────────────────────────────────
TINTA = colors.HexColor('#1F2933')
SUAVE = colors.HexColor('#52606D')
ACENTO = colors.HexColor('#C2410C')
FUNDO = colors.HexColor('#F3F4F6')
FALA = colors.HexColor('#FFF7ED')
LINHA = colors.HexColor('#CBD2D9')
AZUL = colors.HexColor('#1D4ED8')
AZUL_F = colors.HexColor('#EFF6FF')

base = dict(fontName='Sans', textColor=TINTA)
S = {
    'titulo': ParagraphStyle('titulo', fontName='Sans-B', fontSize=22, leading=27, textColor=TINTA),
    'sub': ParagraphStyle('sub', fontName='Sans', fontSize=11.5, leading=16, textColor=SUAVE, spaceAfter=4),
    'corpo': ParagraphStyle('corpo', **base, fontSize=10, leading=14, spaceAfter=4),
    'item': ParagraphStyle('item', **base, fontSize=10, leading=13.6, leftIndent=14, bulletIndent=3, spaceAfter=2),
    'passo': ParagraphStyle('passo', **base, fontSize=10, leading=13.6, leftIndent=18, bulletIndent=2, spaceAfter=2),
    'h1': ParagraphStyle('h1', fontName='Sans-B', fontSize=15, leading=19, textColor=TINTA, spaceBefore=6,
                         spaceAfter=8),
    'rot': ParagraphStyle('rot', fontName='Sans-B', fontSize=9, leading=12, textColor=ACENTO, spaceBefore=6,
                          spaceAfter=2),
    'fala': ParagraphStyle('fala', fontName='Sans-I', fontSize=10, leading=14.2, textColor=TINTA),
    'cel': ParagraphStyle('cel', **base, fontSize=9, leading=11.6),
    'celb': ParagraphStyle('celb', fontName='Sans-B', fontSize=9, leading=11.6, textColor=colors.white),
    'cab': ParagraphStyle('cab', fontName='Sans-B', fontSize=12, leading=15, textColor=colors.white),
    'cabd': ParagraphStyle('cabd', fontName='Sans', fontSize=9.5, leading=15, textColor=colors.white,
                           alignment=2),
    'cod': ParagraphStyle('cod', fontName='Mono', fontSize=8.6, leading=11.4, textColor=TINTA),
    'nota': ParagraphStyle('nota', fontName='Sans', fontSize=9, leading=12.4, textColor=SUAVE),
    'perg': ParagraphStyle('perg', fontName='Sans-B', fontSize=10, leading=13.6, textColor=TINTA, spaceBefore=5),
    'resp': ParagraphStyle('resp', **base, fontSize=9.8, leading=13.4, leftIndent=12, spaceAfter=2),
}
LARGURA = A4[0] - 3.6 * cm


def C(texto: str) -> str:
    """Trecho de código dentro de um parágrafo."""
    return f'<font name="Mono" size="9">{escape(texto)}</font>'


def P(texto: str, estilo: str = 'corpo') -> Paragraph:
    return Paragraph(texto, S[estilo])


def itens(lista: list[str], estilo: str = 'item') -> list[Paragraph]:
    return [Paragraph(t, S[estilo], bulletText='•') for t in lista]


def caixas(lista: list[str]) -> list[Table]:
    """Checklist com um quadradinho desenhado para marcar à mão."""
    saida = []
    for t in lista:
        quad = Drawing(9, 9)
        quad.add(Rect(0, 0, 8.5, 8.5, fillColor=colors.white, strokeColor=TINTA, strokeWidth=0.8))
        linha = Table([[quad, Paragraph(t, S['corpo'])]], colWidths=[0.6 * cm, LARGURA - 0.6 * cm])
        linha.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (0, 0), 3.5),
            ('TOPPADDING', (1, 0), (1, 0), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        saida.append(linha)
    return saida


def passos(lista: list[str]) -> list[Paragraph]:
    return [Paragraph(t, S['passo'], bulletText=f'{i}.') for i, t in enumerate(lista, 1)]


def comandos(linhas: list[str]) -> Table:
    corpo = '<br/>'.join(escape(l).replace(' ', '&nbsp;') if l.startswith('  ') else escape(l) for l in linhas)
    t = Table([[Paragraph(corpo, S['cod'])]], colWidths=[LARGURA - 0.4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), FUNDO),
        ('LINEBEFORE', (0, 0), (0, -1), 2.2, SUAVE),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    t.hAlign = 'RIGHT'
    return t


def caixa_fala(texto: str) -> Table:
    t = Table([[Paragraph(f'“{texto}”', S['fala'])]], colWidths=[LARGURA])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), FALA),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACENTO),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return t


def caixa_info(titulo: str, linhas: list[str], cor=AZUL, fundo=AZUL_F) -> Table:
    conteudo = [P(f'<font color="{cor.hexval()}"><b>{titulo}</b></font>', 'corpo')] + itens(linhas)
    t = Table([[conteudo]], colWidths=[LARGURA])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), fundo), ('BOX', (0, 0), (-1, -1), 0.6, cor),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def tabela(cabecalho: list[str], linhas: list[list[str]], larguras: list[float]) -> Table:
    dados = [[Paragraph(c, S['celb']) for c in cabecalho]]
    dados += [[Paragraph(c, S['cel']) for c in linha] for linha in linhas]
    t = Table(dados, colWidths=[l * LARGURA for l in larguras], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TINTA),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, FUNDO]),
        ('GRID', (0, 0), (-1, -1), 0.4, LINHA),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def cabecalho_bloco(n: int, titulo: str, duracao: str, relogio: str, reqs: str) -> Table:
    t = Table([[Paragraph(f'{n} · {titulo}', S['cab']),
                Paragraph(f'<b>{duracao}</b> · {relogio} · {reqs}', S['cabd'])]],
              colWidths=[LARGURA * 0.55, LARGURA * 0.45])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ACENTO),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def bloco(n, titulo, duracao, relogio, reqs, objetivo, acoes, cmds, fala, apontar, perguntas, figura=None):
    """Um bloco da apresentação: o que mostrar, o que digitar, o que falar e o que podem perguntar."""
    partes = [cabecalho_bloco(n, titulo, duracao, relogio, reqs), Spacer(1, 5),
              P(f'<b>Objetivo:</b> {objetivo}')]
    inicio = [CondPageBreak(7 * cm)] + partes
    if figura is not None:
        inicio += [Spacer(1, 6), figura]
    fazer = [P('O QUE FAZER', 'rot')] + passos(acoes)
    if cmds:
        fazer += [Spacer(1, 3), comandos(cmds)]
    corpo = [KeepTogether(fazer), KeepTogether([P('O QUE FALAR', 'rot'), caixa_fala(fala)])]
    if apontar:
        corpo += [KeepTogether([P('APONTE NA TELA', 'rot')] + itens(apontar))]
    if perguntas:
        primeira = True
        for p, r in perguntas:
            par = [P(p, 'perg'), P(r, 'resp')]
            corpo += [KeepTogether(([P('SE PERGUNTAREM', 'rot')] if primeira else []) + par)]
            primeira = False
    return inicio + corpo + [Spacer(1, 14)]


# ── Diagrama do fluxo de uma requisição ───────────────────────────────────────────────────
def diagrama() -> Drawing:
    w = LARGURA
    caixas_d = [('App', 'celular / 4G'), ('DNS', 'DuckDNS'), ('SG', 'Security Group :443'),
                ('UFW', 'firewall Linux'), ('Nginx', ':443 TLS · proxy'), ('API', '127.0.0.1:3333'),
                ('MySQL', '127.0.0.1:3306')]
    n = len(caixas_d)
    gap = 10
    bw = (w - 10 - gap * (n - 1)) / n
    bh = 40
    y = 58
    d = Drawing(w, 130)
    # molduras AWS e EC2
    x_sg = 2 * (bw + gap) - 5
    d.add(Rect(x_sg, 18, w - x_sg - 0.5, 112, fillColor=colors.HexColor('#FFFBEB'), strokeColor=colors.HexColor('#D97706'),
               strokeWidth=0.7, strokeDashArray=[3, 2]))
    d.add(String(x_sg + 5, 120, 'AWS us-east-2 (Ohio)', fontName='Sans-B', fontSize=7.5,
                 fillColor=colors.HexColor('#B45309')))
    x_ec2 = 3 * (bw + gap) - 5
    d.add(Rect(x_ec2, 24, w - x_ec2 - 3, 90, fillColor=colors.HexColor('#F8FAFC'), strokeColor=SUAVE,
               strokeWidth=0.6))
    d.add(String(x_ec2 + 5, 104, 'EC2 t3.small · Ubuntu 24.04 · EBS gp3 20 GB', fontName='Sans-B', fontSize=7.5,
                 fillColor=SUAVE))
    for i, (t1, t2) in enumerate(caixas_d):
        x = i * (bw + gap)
        destaque = t1 in ('Nginx', 'API', 'MySQL')
        d.add(Rect(x, y, bw, bh, rx=4, ry=4, fillColor=colors.white if not destaque else FALA,
                   strokeColor=ACENTO if destaque else TINTA, strokeWidth=0.9))
        d.add(String(x + bw / 2, y + bh - 15, t1, fontName='Sans-B', fontSize=8.5, textAnchor='middle',
                     fillColor=TINTA))
        d.add(String(x + bw / 2, y + 9, t2, fontName='Sans', fontSize=5.6, textAnchor='middle', fillColor=SUAVE))
        if i < n - 1:
            xa, xb, ym = x + bw + 1, x + bw + gap - 1, y + bh / 2
            d.add(Line(xa, ym, xb - 3, ym, strokeColor=TINTA, strokeWidth=0.9))
            d.add(Polygon([xb, ym, xb - 4, ym + 2.5, xb - 4, ym - 2.5], fillColor=TINTA, strokeColor=TINTA))
    d.add(String(x_ec2 + 5, 32, 'Fora da EC2: backup diário no S3 + cópia no PC · métricas e logs no CloudWatch',
                 fontName='Sans-I', fontSize=6.6, fillColor=SUAVE))
    d.add(String(0, 30, 'SSH :22 só do IP', fontName='Sans', fontSize=6.6, fillColor=SUAVE))
    d.add(String(0, 22, 'do administrador (/32)', fontName='Sans', fontSize=6.6, fillColor=SUAVE))
    return d


# ── Conteúdo ─────────────────────────────────────────────────────────────────────────────
def conteudo() -> list:
    h = []
    h += [P('Roteiro da apresentação', 'titulo'),
          P('Fast Street em produção · Projeto Final de Infraestrutura de Servidores · 20–25 min', 'sub'),
          P('Material de estudo de Mr. Thiago: ordem da demonstração, comandos, o que falar em cada bloco e as '
            'respostas às perguntas técnicas do item 15. Baseado em <i>roteiro-apresentacao.md</i>, '
            '<i>01-arquitetura.md</i>, <i>03-operacao.md</i>, <i>guia-estudo.md</i> e no diário de execução.', 'nota'),
          Spacer(1, 10)]

    h += [P('Visão geral: a ordem em uma tabela', 'h1'),
          tabela(['#', 'Relógio', 'Bloco', 'Mensagem principal'], [
              ['1', '00:00–03:00', 'PROEX funcionando', 'O sistema está no ar e é acessado pela Internet de verdade (4G).'],
              ['2', '03:00–06:00', 'Arquitetura', 'Caminho da requisição: DNS → SG → UFW → Nginx → API → MySQL.'],
              ['3', '06:00–09:00', 'Linux e acesso', 'Sem root, chave por pessoa, sudo auditado, usuário de serviço sem shell.'],
              ['4', '09:00–12:00', 'Rede e Nginx', 'Só 80/443 são públicas; API e banco só no loopback.'],
              ['5', '12:00–14:00', 'Serviços (systemd)', '<i>enable</i> × <i>start</i>; Restart=on-failure; volta sozinho no reboot.'],
              ['6', '14:00–17:00', 'Monitoramento', 'Ler o access.log: o 404 veio da API (ustatus=404).'],
              ['7', '17:00–21:00', '<b>Incidente controlado</b>', '<b>502 = Nginx vivo, upstream fora (connection refused).</b>'],
              ['8', '21:00–23:00', 'Backup', 'Git guarda código; backup guarda dados. Restauração testada.'],
              ['9', '23:00–fim', 'Perguntas', 'Usar a seção “Perguntas do item 15”.'],
          ], [0.05, 0.15, 0.24, 0.56]),
          Spacer(1, 6),
          P('O bloco 7 (incidente) é o que mais pesa e o que mais depende de tempo real: ensaie-o pelo menos uma '
            'vez antes da aula.', 'nota'),
          Spacer(1, 10)]

    h += [P('Antes de começar', 'h1')]
    h += caixas([
        'Terminal SSH aberto e conectado na EC2.',
        'Navegador do celular aberto, <b>no 4G</b> (fora da rede de casa).',
        'Console da AWS aberto (EC2 → Security Groups; CloudWatch).',
        f'Conferir {C("https://faststreet.duckdns.org/health")} → 200.',
        'Conta fictícia do app pronta (login testado).',
        '<b>Plano B:</b> o SSH só aceita o IP de casa. Liberar o IP do local no Security Group <b>antes</b> e '
        'removê-lo <b>depois</b>. Se a Internet do local falhar, demonstrar pelo 4G do celular.',
    ])
    h += [Spacer(1, 6),
          caixa_info('Nunca projetar', [
              f'{C("/etc/fast-street/api.env")} (segredos da API) nem o token do DuckDNS.',
              'Chave privada SSH, senhas, tokens de acesso.',
              'Se precisar mostrar permissões, use só ' + C('ls -l') + ', nunca ' + C('cat') + ' do arquivo.',
          ], cor=colors.HexColor('#B91C1C'), fundo=colors.HexColor('#FEF2F2')),
          PageBreak()]

    # ── Blocos ───────────────────────────────────────────────────────────────────────────
    h += bloco(
        1, 'PROEX funcionando', '3 min', '00:00–03:00', 'R01',
        'provar que o sistema está em produção e é acessado pela Internet pública.',
        [f'No celular (4G): abrir {C("https://faststreet.duckdns.org/cidades")} → JSON com as cidades.',
         'No app: login com a conta fictícia → mostrar o feed de eventos.'],
        None,
        'A Fast Street é um app para pilotos e organizadores de eventos automotivos: o piloto cadastra a conta '
        'e a garagem, encontra eventos pelo feed, filtrado por distância, e se inscreve; o organizador cria '
        'eventos e registra resultados. O app é mobile, em React Native com Expo. Por isso, conforme o '
        'cenário 4 do item 1.3, o que roda na EC2 é a API que ele consome: Node.js 22, Express 5 e MySQL 8. '
        'Estou acessando pelo 4G, fora da minha rede, ou seja, pela Internet de verdade.',
        ['O cadeado do HTTPS no navegador.', 'Que o JSON veio do domínio público, não de localhost.'],
        [('Por que o app não está “instalado” no servidor?',
          'O app roda no celular; o servidor hospeda o backend que ele usa (e a versão web em /app/, '
          'servida pelo Nginx como arquivos estáticos).')])

    h += bloco(
        2, 'Arquitetura', '3 min', '03:00–06:00', 'R03 · R04',
        'mostrar que você entende cada camada que uma requisição atravessa.',
        ['Projetar o diagrama abaixo (ou o de <i>01-arquitetura.md</i>).',
         f'Percorrer, com o dedo, o caminho de {C("GET https://faststreet.duckdns.org/cidades")}.'],
        None,
        'O app resolve faststreet.duckdns.org no DNS e recebe o IP elástico 18.116.147.33. O pacote chega à '
        'AWS, e o Security Group permite a porta 443. Dentro do Ubuntu, o UFW também permite a 443. O Nginx '
        'aceita a conexão, faz o TLS com o certificado Let\'s Encrypt, aplica um limite por IP, registra no '
        'log e encaminha com proxy_pass para 127.0.0.1:3333. A API, um processo Node gerenciado pelo systemd, '
        'consulta o MySQL pelo loopback e devolve JSON. A resposta volta pelo mesmo caminho, já cifrada.',
        ['Instância: EC2 t3.small (2 vCPU, 2 GB RAM), Ubuntu 24.04 LTS, EBS gp3 20 GB, região us-east-2.',
         'As portas 3333 e 3306 estão em 127.0.0.1: nunca saem da máquina.',
         'Fora da EC2: backup no S3 e métricas/logs no CloudWatch.'],
        [('Quais os limites de uma única EC2?',
          'Ponto único de falha (SPOF): sem balanceador, réplica nem multi-AZ. Se a instância ou a zona cair, '
          'o serviço fica fora até a restauração. RPO ≈ 24 h (backup diário); RTO de minutos a horas. Alta '
          'disponibilidade exigiria várias instâncias em zonas diferentes atrás de um ALB e banco gerenciado '
          'com réplica (RDS Multi-AZ).')],
        figura=KeepTogether([diagrama(), P('Fluxo de uma requisição até o banco.', 'nota')]))

    h += bloco(
        3, 'Linux e acesso', '3 min', '06:00–09:00', 'R05 · R06',
        'mostrar o controle de acesso e o princípio do menor privilégio.',
        ['Rodar os comandos abaixo e comentar a saída de cada um.'],
        ['whoami; id; hostnamectl; uname -a', 'free -h; df -h', 'ls -l /opt/fast-street /etc/fast-street'],
        'Entro com a minha conta pessoal, por chave SSH, nunca como root: o login direto de root está '
        'desativado (PermitRootLogin no). Tenho sudo, e tudo que faço com sudo fica registrado em '
        '/var/log/auth.log. A API roda com o usuário faststreet, que não tem senha nem shell. O código fica em '
        '/opt/fast-street com dono root: se a API for comprometida, ela não consegue alterar o próprio código '
        'nem ler o /home. Os segredos ficam em /etc/fast-street/api.env, com permissão 640 root:faststreet: '
        'o root escreve, a API lê e os demais não veem nada.',
        [f'No {C("id")}: o grupo {C("sudo")}.',
         f'No {C("ls -l")}: dono {C("root")}, grupo {C("faststreet")} e o {C("rw-r-----")} (640) do api.env.',
         f'No {C("hostnamectl")}: Ubuntu 24.04 e virtualização da AWS.'],
        [('Como funcionam as chaves SSH?',
          'A chave privada fica só com o titular; o servidor guarda a pública em ~/.ssh/authorized_keys. Cada '
          'integrante tem a sua: revogar um acesso é remover uma linha.'),
         ('Por que não rodar a API como root ou ubuntu?',
          'Viola o menor privilégio: uma falha na API daria controle da máquina inteira.')])

    h += bloco(
        4, 'Rede e Nginx', '3 min', '09:00–12:00', 'R04 · R07',
        'explicar por que só 80/443 são públicas e como o Nginx entrega a requisição à API.',
        ['Console da AWS: mostrar as regras de entrada do Security Group.',
         'Terminal: rodar os comandos abaixo.'],
        ['sudo ss -lntp', 'sudo ufw status', 'cat /etc/nginx/sites-available/fast-street', 'sudo nginx -t'],
        'No Security Group, a 22 está liberada só para o meu IP (/32) e a 80 e a 443 para todos. No ss -lntp '
        'dá para ver que o Nginx escuta em 0.0.0.0:80 e 443, mas a API está em 127.0.0.1:3333 e o MySQL em '
        '127.0.0.1:3306, no loopback: são inalcançáveis de fora. Só o Nginx, na mesma máquina, precisa falar '
        'com a API; expô-la direto pularia o TLS, os logs e o limite por IP. O Security Group e o UFW são '
        'duas camadas independentes: defesa em profundidade. O nginx -t valida a sintaxe antes do reload.',
        [f'{C("proxy_pass")} para 127.0.0.1:3333 e os cabeçalhos {C("X-Forwarded-For / -Proto")} '
         '(a API recebe o IP real do cliente).',
         f'{C("limit_req")}: 20 req/s por IP, com rajada de 40; excedente recebe 429.',
         'A porta 80 existe para redirecionar a HTTPS e para o desafio HTTP-01 da Let\'s Encrypt.'],
        [('Timeout × connection refused?',
          'Timeout: o pacote foi descartado (geralmente firewall/SG). Connection refused: o pacote chegou, mas '
          'nada escuta na porta (confirmar com ss -lntp).'),
         ('Servidor estático × proxy reverso?',
          'Estático: o Nginx lê arquivos do disco (root, try_files), como no app web em /app/. Proxy reverso: '
          'repassa a requisição a outro processo (proxy_pass) e devolve a resposta dele, como na API.')])

    h += bloco(
        5, 'Serviços (systemd)', '2 min', '12:00–14:00', 'R08',
        'mostrar que tudo sobe sozinho e se recupera de falhas.',
        ['Rodar os comandos abaixo.',
         'Mostrar no diário o registro do reboot de 24/11 às 02:49 UTC.'],
        ['systemctl status nginx fast-street-api --no-pager',
         'systemctl is-enabled nginx mysql fast-street-api fast-street-backup.timer'],
        'start liga o serviço agora; enable faz ele subir no boot. A unidade da API tem Restart=on-failure '
        'com RestartSec=5: num teste com kill -9 a API voltou sozinha em cerca de 8 segundos, com NRestarts=1. '
        'Já um systemctl stop não dispara reinício, porque é uma parada intencional. No reboot de 24/11, o '
        'sistema voltou em 11,8 segundos e o site respondeu 200 de fora cerca de 1 minuto depois do comando.',
        [f'{C("active (running)")} e {C("enabled")} em todos.',
         f'Endurecimento da unidade: {C("User=faststreet")}, {C("ProtectSystem=strict")}, '
         f'{C("NoNewPrivileges=true")}, {C("ProtectHome=true")}.'],
        [('Processo no terminal × serviço systemd?',
          'Um node rodando na sessão SSH é filho do shell: morre quando a sessão fecha e não volta após reboot. '
          'O serviço é filho do systemd (PID 1): sobe no boot, reinicia em falha e tem logs no journal.'),
         ('Timer × cron?',
          'O .timer dispara um .service, tem logs no journal e, com Persistent=true, executa o que foi perdido '
          'com a máquina desligada.')])

    h += bloco(
        6, 'Monitoramento', '3 min', '14:00–17:00', 'R10 · R13',
        'mostrar que você sabe ler métricas e logs e diferenciar quem respondeu.',
        ['Rodar as métricas básicas.',
         'Deixar o tail -f rodando e fazer uma requisição pelo celular: a linha aparece na hora.',
         f'Pelo celular, abrir {C("/rota-inexistente")} → 404 aparece no log.',
         'Console: CloudWatch (métricas de memória/disco e grupos de log).'],
        ['uptime; free -h; df -h', 'sudo tail -f /var/log/nginx/fast-street.access.log'],
        'Cada linha do access.log tem o IP, o horário, a rota, o status, o tempo total (rt) e o status do '
        'upstream (ustatus). Este 404 tem ustatus=404: foi a API que respondeu que a rota não existe, ou seja, '
        'a API está funcionando. O CloudWatch Agent manda memória, disco e logs para fora da EC2, o que o '
        'monitoramento padrão da EC2 não mostra. No teste de concorrência, 5 clientes simultâneos receberam '
        '5 de 5 respostas 200, com rt de 2 ms.',
        [f'Na linha do log: {C("upstream=127.0.0.1:3333 ustatus=404 urt=0.000")}.',
         f'No {C("free -h")}: a coluna <i>available</i>, não a <i>free</i>.'],
        [('Como diferenciar CPU, memória e disco?',
          'CPU: top/uptime, load average acima do nº de vCPUs de forma sustentada. Memória: free -h (available '
          'baixo, swap crescendo, OOM killer no journalctl -k). Disco: df -h com Use% perto de 100% e “No space '
          'left on device”.'),
         ('Erro do Nginx × erro da API?',
          '502 com “connect() failed” no error.log do Nginx = API fora. 500 = a API respondeu, mas com erro '
          '(ver journalctl -u fast-street-api).')])

    h += bloco(
        7, 'Incidente controlado', '4 min', '17:00–21:00', 'R11',
        'simular uma falha, diagnosticá-la com método e recuperar o serviço ao vivo.',
        [f'<b>Estado saudável:</b> celular em {C("/cidades")} → 200.',
         '<b>Introduzir a falha:</b> parar a API (1º comando).',
         '<b>Efeito:</b> celular → <b>502</b> (corpo com API_INDISPONIVEL).',
         f'<b>Diagnóstico:</b> status ({C("inactive (dead)")}), portas (nada na 3333) e error.log.',
         f'<b>Recuperar:</b> {C("start")}; no journal aparece “Migrations em dia” → “ouvindo em '
         f'http://127.0.0.1:3333”.',
         '<b>Verificar:</b> celular → 200 de novo.'],
        ['sudo systemctl stop fast-street-api',
         'systemctl status fast-street-api --no-pager',
         'sudo ss -lntp | grep 3333        # nenhuma linha',
         'sudo tail -n 5 /var/log/nginx/fast-street.error.log',
         'sudo systemctl start fast-street-api',
         'journalctl -u fast-street-api -n 5 --no-pager'],
        'O 502 Bad Gateway mostra que o Nginx está vivo, porque foi ele quem respondeu, mas não conseguiu '
        'falar com o upstream. O error.log confirma: connect() failed (111: Connection refused) while '
        'connecting to upstream. Connection refused significa que o pacote chegou, mas não há processo '
        'escutando na porta; se fosse timeout, eu suspeitaria de firewall ou de um processo travado. E o '
        'Restart=on-failure não religou a API porque o stop foi intencional. Recuperado com start.',
        ['Mostrar o 502 e o 200 no celular: a plateia vê a falha e a recuperação.',
         'No error.log: ' + C('upstream: "http://127.0.0.1:3333/cidades"') + '.'],
        [('Por que 502 se o Nginx está ativo?',
          'O Nginx está de pé, mas o upstream (API) não respondeu: processo parado, porta errada ou travado.'),
         ('E 504?',
          'Gateway Timeout: a API demorou mais que o proxy_read_timeout. 404 é a API respondendo “rota não '
          'existe”.')])

    h += bloco(
        8, 'Backup', '2 min', '21:00–23:00', 'R12',
        'mostrar que os dados sobrevivem à perda da EC2 e que a restauração foi testada.',
        ['Listar o backup no S3 (comando abaixo).',
         'Mostrar a pasta ' + C('Documents\\FastStreet-backups') + ' no PC.',
         'Mostrar o resultado do teste de restauração (diário, 24/11 02:45).'],
        ['aws s3 ls s3://fast-street-backups-thiago/fast-street/ --region us-east-2'],
        'O Git guarda o código, que é reconstruível; o backup guarda os dados que só existem no servidor: '
        'cadastros e fotos. O fast-street-backup.timer roda todo dia às 03:00 UTC: mysqldump com '
        '--single-transaction, fotos e configurações. Fica 7 dias na EC2, vai para o S3 com criptografia, sem '
        'acesso público e sem permissão do servidor para apagar, e eu baixo uma cópia no PC. Segredos não '
        'entram no backup; ficam no cofre de senhas. Testei a restauração num banco separado, '
        'fast_street_restore: 15 tabelas, contagens iguais às da produção e somas SHA-256 conferidas.',
        ['Restaurar em banco <b>separado</b>: a produção nunca é tocada no teste.',
         f'{C("--single-transaction")}: foto consistente do banco sem travar a aplicação.'],
        [('Git × backup?',
          'Git versiona código (reconstruível). Backup protege dados que só existem em produção. Um não '
          'substitui o outro.'),
         ('Por que fora da EC2?',
          'Se a instância ou o volume forem perdidos, um backup no mesmo disco vai junto.')])

    h += [CondPageBreak(5 * cm), cabecalho_bloco(9, 'Perguntas', 'restante', '23:00–fim', 'item 15'),
          Spacer(1, 5),
          P('Responda curto, ligando cada resposta a algo que você <b>mostrou</b> na demonstração. As 14 '
            'perguntas previstas estão na próxima página.'),
          PageBreak()]

    # ── Perguntas do item 15 ─────────────────────────────────────────────────────────────
    h += [P('Perguntas do item 15: respostas para estudar', 'h1')]
    qa = [
        ('1. Qual a diferença entre EC2, Ubuntu e Nginx?',
         'EC2 é a máquina virtual (hardware alugado); Ubuntu é o sistema operacional instalado nela; Nginx é um '
         'programa (serviço) que roda no Ubuntu e atende HTTP.'),
        ('2. Quais as etapas de uma requisição?',
         'DNS → IP elástico → Security Group (443) → UFW → Nginx (TLS, log, limite) → proxy_pass 127.0.0.1:3333 '
         '→ API → MySQL → resposta pelo mesmo caminho.'),
        ('3. IP público × privado?',
         'O privado (172.31.x.x) só existe dentro da VPC; o público (elástico 18.116.147.33) é o que a Internet '
         'vê. A AWS faz NAT 1:1 entre eles, por isso ip -br address na EC2 mostra só o privado.'),
        ('4. Por que limitar o SSH?',
         'SSH dá controle total da máquina. Aberto ao mundo, recebe tentativas automáticas de login o tempo todo; '
         'restrito ao IP do administrador (/32), nem é alcançável por terceiros. fail2ban e login só por chave '
         'são camadas extras.'),
        ('5. Portas 22/80/443; por que a 3333 não é pública?',
         '22 = SSH, 80 = HTTP (redireciona e valida o certificado), 443 = HTTPS. A API só precisa ser alcançada '
         'pelo Nginx, na mesma máquina; expô-la ignoraria o TLS, os logs e o limite do Nginx.'),
        ('6. Servidor estático × proxy reverso?',
         'Estático: o Nginx lê arquivos do disco. Proxy reverso: repassa a requisição a outro processo e devolve '
         'a resposta dele. A API é proxy reverso; o app web em /app/ é estático.'),
        ('7. Processo no terminal × serviço systemd?',
         'O processo no terminal morre com a sessão e não volta no reboot. O serviço sobe no boot (enable), '
         'reinicia em falha (Restart=on-failure) e tem logs no journal.'),
        ('8. Reboot × stop/start?',
         'Reboot reinicia só o SO: mesma máquina, mesmo IP, serviços habilitados voltam sozinhos. Stop/start '
         'desliga a VM e pode religá-la em outro host: o EBS permanece, a RAM se perde e o IP público automático '
         'muda (o elástico não).'),
        ('9. Por que 502 com o Nginx ativo?',
         'O Nginx está de pé, mas o upstream não respondeu. Diagnóstico: systemctl status fast-street-api, '
         'ss -lntp e o error.log do Nginx.'),
        ('10. Para que serve o log de acesso?',
         'Cada linha tem IP, horário, rota, status, tempo total e status do upstream: mostra se a requisição '
         'chegou, o que a API respondeu e quanto demorou.'),
        ('11. Como os segredos ficam fora do público?',
         '.env reais só em /etc/fast-street (640); .gitignore para .env*, chaves e dumps; a API recusa subir com '
         'segredos de exemplo; senhas no cofre; backups sem o api.env; prints com VALOR_OCULTADO.'),
        ('12. Git × backup?',
         'Git guarda o código (reconstruível); o backup guarda os dados (cadastros, fotos) que só existem no '
         'servidor.'),
        ('13. E se o crédito acabar? Como não perder dados?',
         'Ao esgotar créditos ou o prazo do Free Plan, a conta migra para o plano pago ou os recursos são '
         'suspensos. Para não perder dados: backup externo atualizado (S3 + PC), snapshot do EBS e só então '
         'encerrar recursos; nunca terminate sem conferir volumes e snapshots.'),
        ('14. Quais os limites de uma única EC2?',
         'Ponto único de falha, sem redundância nem escala horizontal; manutenção implica indisponibilidade. '
         'Alta disponibilidade exigiria várias instâncias em zonas diferentes atrás de um balanceador e banco '
         'gerenciado com réplica (RDS Multi-AZ).'),
    ]
    for p, r in qa:
        h += [KeepTogether([P(p, 'perg'), P(r, 'resp')])]

    # ── Cola rápida ──────────────────────────────────────────────────────────────────────
    h += [PageBreak(), P('Cola rápida', 'h1'),
          tabela(['Componente', 'Porta / local', 'Gerenciado por', 'Usuário'], [
              ['Nginx', '0.0.0.0:80 e :443', 'nginx.service', 'root (master), www-data (workers)'],
              ['Fast Street API', '<b>127.0.0.1:3333</b> · /opt/fast-street/api', 'fast-street-api.service',
               'faststreet (sem shell)'],
              ['MySQL 8.0', '<b>127.0.0.1:3306</b> · /var/lib/mysql', 'mysql.service', 'mysql'],
              ['Fotos', '/var/lib/fast-street/uploads', '—', 'faststreet (750)'],
              ['Segredos', '/etc/fast-street/api.env', '—', 'root:faststreet (640)'],
              ['Backup', '/var/backups/fast-street → S3 → PC', 'fast-street-backup.timer (03:00 UTC)', 'root (700)'],
              ['DNS dinâmico', 'faststreet.duckdns.org', 'duckdns.timer', '—'],
              ['SSH', '0.0.0.0:22 (SG: só IP admin)', 'ssh.service', 'contas individuais com sudo'],
          ], [0.17, 0.33, 0.27, 0.23]),
          Spacer(1, 10),
          tabela(['Código', 'Quem respondeu', 'Significado'], [
              ['200', 'API', 'Tudo certo.'],
              ['404', 'API (ustatus=404)', 'Rota não existe na aplicação; a API está funcionando.'],
              ['429', 'Nginx', 'Limite por IP excedido (limit_req).'],
              ['500', 'API', 'A API respondeu, mas com erro interno → journalctl -u fast-street-api.'],
              ['502', 'Nginx', 'Upstream fora: connection refused (API parada / porta errada).'],
              ['504', 'Nginx', 'A API demorou mais que o proxy_read_timeout.'],
          ], [0.12, 0.25, 0.63]),
          Spacer(1, 10),
          tabela(['Sintoma', 'Comando'], [
              ['CPU alta', 'top, uptime (load average > nº de vCPUs)'],
              ['Memória', 'free -h (available), ps aux --sort=-%mem, journalctl -k (OOM)'],
              ['Disco', 'df -h, du -sh'],
              ['Porta não escuta', 'ss -lntp'],
              ['Firewall', 'Security Group no console, sudo ufw status'],
              ['Logs', '/var/log/nginx/fast-street.{access,error}.log, journalctl -u fast-street-api'],
          ], [0.25, 0.75]),
          Spacer(1, 12)]

    # ── Extra opcional ───────────────────────────────────────────────────────────────────
    h += [KeepTogether([
        P('Extra opcional: deploy automático (CI/CD)', 'h1'),
        P('Fora da sequência mínima do item 14.2. Use se sobrar tempo ou se perguntarem como o código chega ao '
          'servidor. Custa cerca de 2 min: se for incluir, corte 1 min do bloco 3 e 1 min do bloco 6.', 'nota'),
        Spacer(1, 4),
        caixa_fala('Todo PR roda testes, typecheck, build e lint, e o main é protegido. Depois do merge, o GitHub '
                   'Actions pega credenciais temporárias da AWS por OIDC, sem nenhuma chave fixa guardada no '
                   'GitHub, e manda a EC2 executar o deploy pelo SSM, sem abrir SSH. Cada versão vira uma '
                   'release numa pasta própria, apontada por um link simbólico: se o health check falhar, o '
                   'rollback é automático e leva segundos.'),
        Spacer(1, 4),
        P(f'Arquivos: {C(".github/workflows/ci.yml")}, {C(".github/workflows/deploy.yml")}, '
          f'{C("infra/scripts/deploy-api.sh")}, {C("docs/PLANO_DEPLOY_AUTOMATICO.md")}.', 'nota'),
    ])]
    return h


def rodape(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont('Sans', 8)
    canvas.setFillColor(SUAVE)
    canvas.drawString(1.8 * cm, 1.1 * cm, 'Fast Street · Roteiro da apresentação · Projeto Final de Infraestrutura')
    canvas.drawRightString(A4[0] - 1.8 * cm, 1.1 * cm, f'{doc.page}')
    canvas.setStrokeColor(ACENTO)
    canvas.setLineWidth(2)
    canvas.line(1.8 * cm, A4[1] - 1.2 * cm, A4[0] - 1.8 * cm, A4[1] - 1.2 * cm)
    canvas.restoreState()


def main() -> None:
    doc = SimpleDocTemplate(SAIDA, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                            topMargin=1.7 * cm, bottomMargin=1.7 * cm,
                            title='Roteiro da apresentação · Fast Street', author='Mr. Thiago',
                            subject='Projeto Final de Infraestrutura de Servidores')
    doc.build(conteudo(), onFirstPage=rodape, onLaterPages=rodape)
    print(SAIDA)


if __name__ == '__main__':
    main()

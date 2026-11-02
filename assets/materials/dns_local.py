"""DNS didáctico aislado. Python 3.7+. Solamente 127.0.0.1:53530.

No es un resolvedor de producción. No reenvía consultas a Internet.
Servidor: python3 dns_local.py servidor
Cliente: python3 dns_local.py consulta
"""

import argparse
import socket
import struct

ADDRESS = ("127.0.0.1", 53530)
NAME = "portal.estudio.test"


def make_query():
    labels = b"".join(bytes([len(part)]) + part.encode("ascii") for part in NAME.split("."))
    return struct.pack("!HHHHHH", 0x1042, 0x0100, 1, 0, 0, 0) + labels + b"\0" + struct.pack("!HH", 1, 1)


def make_response(data):
    if len(data) < 12 or len(data) > 512:
        raise ValueError("Tamaño fuera del formato de este ejercicio")
    ident, flags, qd, an, ns, ar = struct.unpack("!HHHHHH", data[:12])
    if flags & 0xF800 or (qd, an, ns, ar) != (1, 0, 0, 0):
        raise ValueError("Este ejercicio admite una pregunta simple sin EDNS")
    cursor = 12
    labels = []
    while True:
        if cursor >= len(data):
            raise ValueError("Nombre incompleto")
        size = data[cursor]
        cursor += 1
        if size == 0:
            break
        if size > 63 or cursor + size > len(data):
            raise ValueError("Etiqueta inválida o comprimida")
        labels.append(data[cursor:cursor + size].decode("ascii"))
        cursor += size
    if cursor + 4 != len(data):
        raise ValueError("Pregunta incompleta o datos adicionales")
    qtype, qclass = struct.unpack("!HH", data[cursor:cursor + 4])
    if qclass != 1:
        raise ValueError("Este ejercicio admite solamente clase IN")
    question = data[12:cursor + 4]
    name = ".".join(labels).lower()
    known = name == NAME and qclass == 1
    answer = b""
    if known and qtype == 1:
        answer = b"\xc0\x0c" + struct.pack("!HHIH", 1, 1, 60, 4) + socket.inet_aton("127.0.0.1")
    response_flags = 0x8400 | (flags & 0x0100) | (0 if known else 3)
    return struct.pack("!HHHHHH", ident, response_flags, 1, int(bool(answer)), 0, 0) + question + answer


def serve():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
        server.bind(ADDRESS)
        print("DNS didáctico en 127.0.0.1:53530. Ctrl+C para terminar.", flush=True)
        while True:
            data, peer = server.recvfrom(513)
            try:
                response = make_response(data)
            except (ValueError, UnicodeError) as error:
                print("Consulta no admitida:", error, flush=True)
                continue
            server.sendto(response, peer)
            print("Consulta local recibida; respuesta enviada.", flush=True)


def query():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
        client.settimeout(3)
        client.connect(ADDRESS)
        client.send(make_query())
        response = client.recv(512)
    print("Respuesta DNS en hexadecimal:")
    print(" ".join("{:02x}".format(value) for value in response))
    print("Usá el paquete o la captura para identificar ID, flags, pregunta y respuesta.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("modo", choices=("servidor", "consulta"))
    arguments = parser.parse_args()
    try:
        serve() if arguments.modo == "servidor" else query()
    except KeyboardInterrupt:
        print("\nServidor cerrado.")
    except OSError as error:
        parser.exit(1, "No se pudo completar la operación local: {}\n".format(error))
